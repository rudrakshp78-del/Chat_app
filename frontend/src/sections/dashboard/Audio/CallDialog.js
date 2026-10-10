import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Slide,
  Stack,
  Typography,
  IconButton,
  Chip,
} from "@mui/material";
import {
  Microphone,
  MicrophoneSlash,
  PhoneDisconnect,
  SpeakerHigh,
  SpeakerSlash,
} from "phosphor-react";
import { useDispatch, useSelector } from "react-redux";
import { socket } from "../../../socket";
import { ResetAudioCallQueue } from "../../../redux/slices/audioCall";
import { showSnackbar } from "../../../redux/slices/app";
import getAvatarUrl, { DEFAULT_USER_AVATAR } from "../../../utils/getAvatarUrl";
import {
  ICE_SERVERS,
  formatCallDuration,
  resolveCallParticipants,
} from "../../../utils/webrtcConfig";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const CallDialog = ({ open, handleClose }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.app);
  const { user_id } = useSelector((state) => state.auth);

  const [call_details] = useSelector((state) => state.audioCall.call_queue);
  const { incoming } = useSelector((state) => state.audioCall);

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamPromiseRef = useRef(null);
  const iceCandidatesQueueRef = useRef([]);
  const processedSignalsRef = useRef(new Set());
  const makingOfferRef = useRef(false);
  const offerReceivedRef = useRef(false);
  const isCleaningUpRef = useRef(false);
  const peerReadyIntervalRef = useRef(null);
  const callTimerRef = useRef(null);
  const durationIntervalRef = useRef(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [callStatus, setCallStatus] = useState(
    incoming ? "Connecting..." : "Calling..."
  );
  const [callDuration, setCallDuration] = useState(0);

  const roomID = (call_details?.roomID || call_details?.call_id || "").toString();
  const { myUserID, remoteUserID, otherUser } = resolveCallParticipants(
    call_details,
    user,
    user_id
  );

  const otherUserName = otherUser
    ? `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim()
    : incoming
    ? "Caller"
    : "Friend";
  const otherUserAvatar = otherUser?.avatar;

  // Send WebRTC signal over both dedicated event and compatible call event
  const sendSignal = useCallback(
    (payload) => {
      if (!roomID || !myUserID || !remoteUserID) return;
      const packet = {
        signalId: `${myUserID}_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        roomID,
        call_id: roomID,
        from: myUserID,
        to: remoteUserID,
        callType: "audio",
        ...payload,
      };
      socket?.emit("webrtc_signal", packet);
      socket?.emit("audio_call_accepted", {
        roomID,
        call_id: roomID,
        streamID: remoteUserID,
        userID: myUserID,
        webrtc_signal: packet,
      });
    },
    [roomID, myUserID, remoteUserID]
  );

  const cleanupMediaAndPeer = useCallback(() => {
    if (peerReadyIntervalRef.current) {
      clearInterval(peerReadyIntervalRef.current);
      peerReadyIntervalRef.current = null;
    }
    if (callTimerRef.current) {
      clearTimeout(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {}
        });
      } catch (e) {}
      localStreamRef.current = null;
    }

    if (remoteAudioRef.current) {
      try {
        remoteAudioRef.current.srcObject = null;
      } catch (e) {}
    }
    remoteStreamRef.current = null;

    if (pcRef.current) {
      try {
        pcRef.current.onicecandidate = null;
        pcRef.current.ontrack = null;
        pcRef.current.oniceconnectionstatechange = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.close();
      } catch (e) {}
      pcRef.current = null;
    }

    iceCandidatesQueueRef.current = [];
    makingOfferRef.current = false;
    offerReceivedRef.current = false;
  }, []);

  const endCallSession = useCallback(
    (notifyRemote = true) => {
      if (isCleaningUpRef.current) return;
      isCleaningUpRef.current = true;

      if (notifyRemote && roomID) {
        try {
          socket?.emit("audio_call_denied", {
            ...call_details,
            call_id: roomID,
            roomID,
            streamID: remoteUserID,
            to: remoteUserID,
            from: myUserID,
          });
          socket?.emit("webrtc_call_ended", {
            roomID,
            call_id: roomID,
            to: remoteUserID,
            from: myUserID,
            callType: "audio",
          });
        } catch (e) {
          console.warn("Socket emit error on end audio call:", e);
        }
      }

      cleanupMediaAndPeer();
      dispatch(ResetAudioCallQueue());

      if (typeof handleClose === "function") {
        handleClose();
      }
    },
    [
      roomID,
      call_details,
      remoteUserID,
      myUserID,
      cleanupMediaAndPeer,
      dispatch,
      handleClose,
    ]
  );

  const handleDisconnect = (event, reason) => {
    if (reason && (reason === "backdropClick" || reason === "escapeKeyDown")) {
      return;
    }
    endCallSession(true);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }
    sendSignal({
      type: "media-state",
      mediaState: { isMuted: nextMuted },
    });
  };

  const handleToggleSpeaker = () => {
    const nextSpeakerMuted = !isSpeakerMuted;
    setIsSpeakerMuted(nextSpeakerMuted);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = nextSpeakerMuted;
    }
  };

  useEffect(() => {
    if (!open || !roomID || !myUserID) return;

    isCleaningUpRef.current = false;
    processedSignalsRef.current.clear();

    // Join call signaling room
    socket?.emit("webrtc_join_room", { roomID, userID: myUserID });

    // Create WebRTC PeerConnection
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    const flushIceQueue = async () => {
      if (!pcRef.current || !pcRef.current.remoteDescription) return;
      while (iceCandidatesQueueRef.current.length > 0) {
        const candidate = iceCandidatesQueueRef.current.shift();
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("Audio addIceCandidate error:", err);
        }
      }
    };

    const attachRemoteStream = (stream) => {
      remoteStreamRef.current = stream;
      if (remoteAudioRef.current) {
        if (remoteAudioRef.current.srcObject !== stream) {
          remoteAudioRef.current.srcObject = stream;
        }
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 1.0;
        remoteAudioRef.current.play().catch((err) => {
          console.warn("Remote audio autoplay blocked, waiting for interaction:", err);
          const resumeAudio = () => {
            if (remoteAudioRef.current) {
              remoteAudioRef.current.play().catch(() => {});
            }
            document.removeEventListener("click", resumeAudio);
            document.removeEventListener("touchstart", resumeAudio);
          };
          document.addEventListener("click", resumeAudio, { once: true });
          document.addEventListener("touchstart", resumeAudio, { once: true });
        });
      }
    };

    const markCallConnected = () => {
      if (callTimerRef.current) {
        clearTimeout(callTimerRef.current);
        callTimerRef.current = null;
      }
      setCallStatus("In Call");
      if (!durationIntervalRef.current) {
        durationIntervalRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: "ice-candidate",
          candidate: event.candidate.toJSON
            ? event.candidate.toJSON()
            : event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      let stream = event.streams && event.streams[0];
      if (!stream) {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        remoteStreamRef.current.addTrack(event.track);
        stream = remoteStreamRef.current;
      }
      attachRemoteStream(stream);
      markCallConnected();
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log("Audio ICE state:", state);
      if (state === "connected" || state === "completed") {
        markCallConnected();
      } else if (state === "failed" && !incoming) {
        // Attempt ICE restart from caller side
        createAndSendOffer(true);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        markCallConnected();
      }
    };

    // Acquire local microphone stream
    const acquireLocalAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        if (isCleaningUpRef.current || !pcRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return null;
        }

        localStreamRef.current = stream;
        stream.getTracks().forEach((track) => {
          pcRef.current.addTrack(track, stream);
        });
        return stream;
      } catch (err) {
        console.warn("Microphone access failed, falling back to recvonly:", err);
        dispatch(
          showSnackbar({
            severity: "warning",
            message: "Microphone unavailable. Joining call in listen-only mode.",
          })
        );
        if (pcRef.current) {
          try {
            pcRef.current.addTransceiver("audio", { direction: "recvonly" });
          } catch (e) {}
        }
        return null;
      }
    };

    localStreamPromiseRef.current = acquireLocalAudio();

    const createAndSendOffer = async (iceRestart = false) => {
      if (
        !pcRef.current ||
        makingOfferRef.current ||
        isCleaningUpRef.current
      ) {
        return;
      }
      if (!iceRestart && pcRef.current.signalingState !== "stable") {
        return;
      }

      try {
        makingOfferRef.current = true;
        await localStreamPromiseRef.current;
        if (!pcRef.current || isCleaningUpRef.current) return;

        const offer = await pcRef.current.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
          iceRestart,
        });
        await pcRef.current.setLocalDescription(offer);

        sendSignal({
          type: "offer",
          sdp: pcRef.current.localDescription,
        });
      } catch (err) {
        console.error("Error creating audio WebRTC offer:", err);
      } finally {
        makingOfferRef.current = false;
      }
    };

    const handleWebRTCSignal = async (signal) => {
      if (!signal || !pcRef.current || isCleaningUpRef.current) return;
      if (signal.roomID && signal.roomID.toString() !== roomID.toString()) {
        return;
      }
      if (signal.from && signal.from.toString() === myUserID.toString()) {
        return;
      }
      if (signal.signalId) {
        if (processedSignalsRef.current.has(signal.signalId)) return;
        processedSignalsRef.current.add(signal.signalId);
      }

      try {
        if (signal.type === "peer-ready") {
          if (!incoming) {
            if (callTimerRef.current) {
              clearTimeout(callTimerRef.current);
              callTimerRef.current = null;
            }
            setCallStatus((prev) =>
              prev === "In Call" ? prev : "Connecting..."
            );
            await createAndSendOffer(false);
          }
        } else if (signal.type === "offer" && signal.sdp) {
          offerReceivedRef.current = true;
          if (peerReadyIntervalRef.current) {
            clearInterval(peerReadyIntervalRef.current);
            peerReadyIntervalRef.current = null;
          }

          await localStreamPromiseRef.current;
          if (!pcRef.current || isCleaningUpRef.current) return;

          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription(signal.sdp)
          );
          await flushIceQueue();

          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);

          sendSignal({
            type: "answer",
            sdp: pcRef.current.localDescription,
          });
        } else if (signal.type === "answer" && signal.sdp) {
          if (pcRef.current.signalingState === "have-local-offer") {
            await pcRef.current.setRemoteDescription(
              new RTCSessionDescription(signal.sdp)
            );
            await flushIceQueue();
          }
        } else if (signal.type === "ice-candidate" && signal.candidate) {
          if (
            pcRef.current.remoteDescription &&
            pcRef.current.remoteDescription.type
          ) {
            await pcRef.current.addIceCandidate(
              new RTCIceCandidate(signal.candidate)
            );
          } else {
            iceCandidatesQueueRef.current.push(signal.candidate);
          }
        } else if (signal.type === "media-state" && signal.mediaState) {
          if (typeof signal.mediaState.isMuted === "boolean") {
            setRemoteMuted(signal.mediaState.isMuted);
          }
        }
      } catch (err) {
        console.error("Audio WebRTC signal handling error:", err);
      }
    };

    const onAudioCallAccepted = (data) => {
      if (data?.webrtc_signal) {
        handleWebRTCSignal(data.webrtc_signal);
        return;
      }
      if (callTimerRef.current) {
        clearTimeout(callTimerRef.current);
        callTimerRef.current = null;
      }
      setCallStatus((prev) => (prev === "In Call" ? prev : "Connecting..."));
    };

    const onRemoteCallEnded = (data) => {
      const eventRoom = data?.roomID || data?.call_id;
      if (eventRoom && roomID && eventRoom.toString() !== roomID.toString()) {
        return;
      }
      if (data?.busy) {
        dispatch(
          showSnackbar({
            severity: "warning",
            message: `${otherUserName} is busy on another call`,
          })
        );
      }
      endCallSession(false);
    };

    socket?.on("webrtc_signal", handleWebRTCSignal);
    socket?.on("audio_call_accepted", onAudioCallAccepted);
    socket?.on("audio_call_denied", onRemoteCallEnded);
    socket?.on("audio_call_missed", onRemoteCallEnded);
    socket?.on("webrtc_call_ended", onRemoteCallEnded);

    if (!incoming) {
      // Caller: notify recipient and start 30-second ring timeout
      socket?.emit("start_audio_call", {
        to: remoteUserID,
        from: myUserID,
        roomID,
        call_id: roomID,
      });
      setCallStatus("Ringing...");

      callTimerRef.current = setTimeout(() => {
        socket?.emit("audio_call_not_picked", {
          to: remoteUserID,
          from: myUserID,
          roomID,
          call_id: roomID,
        });
        endCallSession(false);
      }, 30 * 1000);
    } else {
      // Callee: once local audio is ready, notify caller to send WebRTC offer
      setCallStatus("Connecting...");
      localStreamPromiseRef.current.finally(() => {
        if (isCleaningUpRef.current) return;
        sendSignal({ type: "peer-ready" });
        peerReadyIntervalRef.current = setInterval(() => {
          if (offerReceivedRef.current || isCleaningUpRef.current) {
            clearInterval(peerReadyIntervalRef.current);
            peerReadyIntervalRef.current = null;
            return;
          }
          sendSignal({ type: "peer-ready" });
        }, 1500);
      });
    }

    return () => {
      socket?.off("webrtc_signal", handleWebRTCSignal);
      socket?.off("audio_call_accepted", onAudioCallAccepted);
      socket?.off("audio_call_denied", onRemoteCallEnded);
      socket?.off("audio_call_missed", onRemoteCallEnded);
      socket?.off("webrtc_call_ended", onRemoteCallEnded);
      cleanupMediaAndPeer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, roomID, myUserID]);

  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={handleDisconnect}
      aria-describedby="alert-dialog-slide-description"
      sx={{ "& .MuiDialog-paper": { m: { xs: 1.5, sm: 2 }, minWidth: 320 } }}
    >
      <DialogContent>
        <Stack
          direction="column"
          spacing={3}
          alignItems="center"
          justifyContent="center"
          p={{ xs: 1, sm: 2 }}
        >
          <Stack alignItems="center" spacing={0.5}>
            <Typography variant="overline" color="text.secondary">
              {callStatus}
            </Typography>
            {callDuration > 0 && (
              <Typography variant="subtitle2" color="primary.main">
                {formatCallDuration(callDuration)}
              </Typography>
            )}
          </Stack>

          <Stack
            direction="row"
            spacing={{ xs: 3, sm: 6 }}
            justifyContent="center"
            alignItems="center"
          >
            {/* The Other Participant */}
            <Stack alignItems="center" spacing={1}>
              <Avatar
                sx={{
                  height: { xs: 72, sm: 100 },
                  width: { xs: 72, sm: 100 },
                }}
                src={getAvatarUrl(otherUserAvatar, otherUserName)}
                imgProps={{
                  onError: (e) => {
                    e.currentTarget.src = DEFAULT_USER_AVATAR;
                  },
                }}
              >
                {(otherUserName || "U")[0]}
              </Avatar>
              <Typography variant="subtitle2">{otherUserName}</Typography>
              {remoteMuted && (
                <Chip
                  size="small"
                  color="error"
                  variant="outlined"
                  label="Muted"
                  sx={{ height: 20, fontSize: 10 }}
                />
              )}
            </Stack>

            {/* You */}
            <Stack alignItems="center" spacing={1}>
              <Avatar
                sx={{
                  height: { xs: 72, sm: 100 },
                  width: { xs: 72, sm: 100 },
                }}
                src={getAvatarUrl(user?.avatar, user?.firstName)}
                imgProps={{
                  onError: (e) => {
                    e.currentTarget.src = DEFAULT_USER_AVATAR;
                  },
                }}
              >
                {(user?.firstName || "Y")[0]}
              </Avatar>
              <Typography variant="subtitle2">
                {user?.firstName || "You"}
              </Typography>
              {isMuted && (
                <Chip
                  size="small"
                  color="error"
                  variant="outlined"
                  label="Muted"
                  sx={{ height: 20, fontSize: 10 }}
                />
              )}
            </Stack>
          </Stack>

          {/* Audio element for remote stream */}
          <audio ref={remoteAudioRef} id="remote-audio" autoPlay playsInline />

          {/* Call Controls */}
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton
              onClick={handleToggleMute}
              color={isMuted ? "error" : "primary"}
              sx={{ border: "1px solid", borderColor: "divider" }}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? <MicrophoneSlash size={22} /> : <Microphone size={22} />}
            </IconButton>

            <IconButton
              onClick={handleToggleSpeaker}
              color={isSpeakerMuted ? "error" : "primary"}
              sx={{ border: "1px solid", borderColor: "divider" }}
              title={isSpeakerMuted ? "Unmute Speaker" : "Mute Speaker"}
            >
              {isSpeakerMuted ? (
                <SpeakerSlash size={22} />
              ) : (
                <SpeakerHigh size={22} />
              )}
            </IconButton>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
        <Button
          onClick={handleDisconnect}
          variant="contained"
          color="error"
          startIcon={<PhoneDisconnect size={20} />}
        >
          End Call
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CallDialog;