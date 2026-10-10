import React, { useEffect, useRef, useState, useCallback } from "react";
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
  Box,
  Chip,
} from "@mui/material";
import {
  Microphone,
  MicrophoneSlash,
  VideoCamera,
  VideoCameraSlash,
  PhoneDisconnect,
} from "phosphor-react";
import { useDispatch, useSelector } from "react-redux";
import { socket } from "../../../socket";
import { ResetVideoCallQueue } from "../../../redux/slices/videoCall";
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

  const [call_details] = useSelector((state) => state.videoCall.call_queue);
  const { incoming } = useSelector((state) => state.videoCall);

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
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
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [remoteVideoOff, setRemoteVideoOff] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
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
        callType: "video",
        ...payload,
      };
      socket?.emit("webrtc_signal", packet);
      socket?.emit("video_call_accepted", {
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

    if (localVideoRef.current) {
      try {
        localVideoRef.current.srcObject = null;
      } catch (e) {}
    }

    if (remoteVideoRef.current) {
      try {
        remoteVideoRef.current.srcObject = null;
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
          socket?.emit("video_call_denied", {
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
            callType: "video",
          });
        } catch (e) {
          console.warn("Socket emit error on end video call:", e);
        }
      }

      cleanupMediaAndPeer();
      dispatch(ResetVideoCallQueue());

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
      mediaState: { isMuted: nextMuted, isVideoOff },
    });
  };

  const handleToggleVideo = () => {
    const nextVideoOff = !isVideoOff;
    setIsVideoOff(nextVideoOff);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !nextVideoOff;
      });
    }
    sendSignal({
      type: "media-state",
      mediaState: { isMuted, isVideoOff: nextVideoOff },
    });
  };

  // Ensure remote stream stays bound to remoteVideoRef when re-rendering
  useEffect(() => {
    if (hasRemoteStream && remoteVideoRef.current && remoteStreamRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.volume = 1.0;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [hasRemoteStream, remoteVideoOff]);

  useEffect(() => {
    if (!open || !roomID || !myUserID) return;

    isCleaningUpRef.current = false;
    processedSignalsRef.current.clear();

    // Join call signaling room
    socket?.emit("webrtc_join_room", { roomID, userID: myUserID });

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    const flushIceQueue = async () => {
      if (!pcRef.current || !pcRef.current.remoteDescription) return;
      while (iceCandidatesQueueRef.current.length > 0) {
        const candidate = iceCandidatesQueueRef.current.shift();
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("Video addIceCandidate error:", err);
        }
      }
    };

    const attachRemoteStream = (stream) => {
      remoteStreamRef.current = stream;
      setHasRemoteStream(true);
      if (remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== stream) {
          remoteVideoRef.current.srcObject = stream;
        }
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.volume = 1.0;
        remoteVideoRef.current.play().catch((err) => {
          console.warn("Remote video autoplay blocked, waiting for interaction:", err);
          const resumeVideo = () => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.play().catch(() => {});
            }
            document.removeEventListener("click", resumeVideo);
            document.removeEventListener("touchstart", resumeVideo);
          };
          document.addEventListener("click", resumeVideo, { once: true });
          document.addEventListener("touchstart", resumeVideo, { once: true });
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
      } else {
        // Ensure all incoming tracks (both audio and video) are in remoteStreamRef
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = stream;
        } else if (remoteStreamRef.current !== stream) {
          stream.getTracks().forEach((t) => {
            if (!remoteStreamRef.current.getTracks().some((et) => et.id === t.id)) {
              remoteStreamRef.current.addTrack(t);
            }
          });
          stream = remoteStreamRef.current;
        }
      }
      attachRemoteStream(stream);
      markCallConnected();
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log("Video ICE state:", state);
      if (state === "connected" || state === "completed") {
        markCallConnected();
      } else if (state === "failed" && !incoming) {
        createAndSendOffer(true);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        markCallConnected();
      }
    };

    // Acquire local camera + microphone with graceful fallback if camera is busy/missing
    const acquireLocalMedia = async () => {
      let stream = null;
      let videoUnavailable = false;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
        });
      } catch (videoErr) {
        console.warn("Camera + mic getUserMedia failed, trying audio-only:", videoErr);
        videoUnavailable = true;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          });
        } catch (audioErr) {
          console.warn("Audio getUserMedia also failed:", audioErr);
        }
      }

      if (isCleaningUpRef.current || !pcRef.current) {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        return null;
      }

      if (stream) {
        localStreamRef.current = stream;
        if (localVideoRef.current && stream.getVideoTracks().length > 0) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
          localVideoRef.current.defaultMuted = true;
          localVideoRef.current.play().catch(() => {});
        }
        stream.getTracks().forEach((track) => {
          pcRef.current.addTrack(track, stream);
        });

        if (videoUnavailable || stream.getVideoTracks().length === 0) {
          setIsVideoOff(true);
          try {
            pcRef.current.addTransceiver("video", { direction: "recvonly" });
          } catch (e) {}
          sendSignal({
            type: "media-state",
            mediaState: { isMuted: false, isVideoOff: true },
          });
        }
      } else {
        setIsVideoOff(true);
        dispatch(
          showSnackbar({
            severity: "warning",
            message: "Camera/microphone unavailable. Joining in view-only mode.",
          })
        );
        try {
          pcRef.current.addTransceiver("audio", { direction: "recvonly" });
          pcRef.current.addTransceiver("video", { direction: "recvonly" });
        } catch (e) {}
      }

      return stream;
    };

    localStreamPromiseRef.current = acquireLocalMedia();

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
          offerToReceiveVideo: true,
          iceRestart,
        });
        await pcRef.current.setLocalDescription(offer);

        sendSignal({
          type: "offer",
          sdp: pcRef.current.localDescription,
        });
      } catch (err) {
        console.error("Error creating video WebRTC offer:", err);
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
          if (typeof signal.mediaState.isVideoOff === "boolean") {
            setRemoteVideoOff(signal.mediaState.isVideoOff);
          }
        }
      } catch (err) {
        console.error("Video WebRTC signal handling error:", err);
      }
    };

    const onVideoCallAccepted = (data) => {
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
    socket?.on("video_call_accepted", onVideoCallAccepted);
    socket?.on("video_call_denied", onRemoteCallEnded);
    socket?.on("video_call_missed", onRemoteCallEnded);
    socket?.on("webrtc_call_ended", onRemoteCallEnded);

    if (!incoming) {
      socket?.emit("start_video_call", {
        to: remoteUserID,
        from: myUserID,
        roomID,
        call_id: roomID,
      });
      setCallStatus("Ringing...");

      callTimerRef.current = setTimeout(() => {
        socket?.emit("video_call_not_picked", {
          to: remoteUserID,
          from: myUserID,
          roomID,
          call_id: roomID,
        });
        endCallSession(false);
      }, 30 * 1000);
    } else {
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
      socket?.off("video_call_accepted", onVideoCallAccepted);
      socket?.off("video_call_denied", onRemoteCallEnded);
      socket?.off("video_call_missed", onRemoteCallEnded);
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
      sx={{
        "& .MuiDialog-paper": {
          m: { xs: 1.5, sm: 2 },
          maxWidth: 680,
          width: "100%",
        },
      }}
    >
      <DialogContent>
        <Stack spacing={2} alignItems="center">
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
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 2, sm: 3 }}
            alignItems="center"
            justifyContent="center"
            sx={{ width: "100%" }}
          >
            {/* Remote Video */}
            <Stack
              alignItems="center"
              spacing={1}
              sx={{ width: { xs: "100%", sm: "50%" } }}
            >
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "4/3",
                  borderRadius: 2,
                  overflow: "hidden",
                  backgroundColor: "#161C24",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <video
                  ref={remoteVideoRef}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display:
                      hasRemoteStream && !remoteVideoOff ? "block" : "none",
                  }}
                  id="remote-video"
                  autoPlay
                  playsInline
                />
                {(!hasRemoteStream || remoteVideoOff) && (
                  <Stack alignItems="center" spacing={1}>
                    <Avatar
                      sx={{ width: 64, height: 64 }}
                      src={getAvatarUrl(otherUserAvatar, otherUserName)}
                      imgProps={{
                        onError: (e) => {
                          e.currentTarget.src = DEFAULT_USER_AVATAR;
                        },
                      }}
                    >
                      {(otherUserName || "U")[0]}
                    </Avatar>
                    <Typography variant="caption" sx={{ color: "grey.400" }}>
                      {remoteVideoOff ? "Camera Off" : callStatus}
                    </Typography>
                  </Stack>
                )}
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
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
            </Stack>

            {/* Local Video */}
            <Stack
              alignItems="center"
              spacing={1}
              sx={{ width: { xs: "100%", sm: "50%" } }}
            >
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "4/3",
                  borderRadius: 2,
                  overflow: "hidden",
                  backgroundColor: "#161C24",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <video
                  ref={localVideoRef}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scaleX(-1)",
                    display: isVideoOff ? "none" : "block",
                  }}
                  id="local-video"
                  autoPlay
                  muted
                  playsInline
                />
                {isVideoOff && (
                  <Stack alignItems="center" spacing={1}>
                    <Avatar
                      sx={{ width: 64, height: 64 }}
                      src={getAvatarUrl(user?.avatar, user?.firstName)}
                      imgProps={{
                        onError: (e) => {
                          e.currentTarget.src = DEFAULT_USER_AVATAR;
                        },
                      }}
                    >
                      {(user?.firstName || "Y")[0]}
                    </Avatar>
                    <Typography variant="caption" sx={{ color: "grey.400" }}>
                      Camera Off
                    </Typography>
                  </Stack>
                )}
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2">You</Typography>
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
          </Stack>

          {/* Call Controls */}
          <Stack direction="row" spacing={2} alignItems="center" pt={1}>
            <IconButton
              onClick={handleToggleMute}
              color={isMuted ? "error" : "primary"}
              sx={{ border: "1px solid", borderColor: "divider" }}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? (
                <MicrophoneSlash size={22} />
              ) : (
                <Microphone size={22} />
              )}
            </IconButton>

            <IconButton
              onClick={handleToggleVideo}
              color={isVideoOff ? "error" : "primary"}
              sx={{ border: "1px solid", borderColor: "divider" }}
              title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
            >
              {isVideoOff ? (
                <VideoCameraSlash size={22} />
              ) : (
                <VideoCamera size={22} />
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