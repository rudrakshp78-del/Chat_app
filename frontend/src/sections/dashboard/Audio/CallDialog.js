import React, { useRef, useEffect, useState } from "react";
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
} from "@mui/material";
import { Microphone, MicrophoneSlash, PhoneDisconnect } from "phosphor-react";
import { ZegoExpressEngine } from "zego-express-engine-webrtc";
import { useDispatch, useSelector } from "react-redux";
import axiosInstance from "../../../utils/axios";
import { socket } from "../../../socket";
import { ResetAudioCallQueue } from "../../../redux/slices/audioCall";
import { ZEGO_APP_ID, ZEGO_SERVER } from "../../../config";
import getAvatarUrl from "../../../utils/getAvatarUrl";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const CallDialog = ({ open, handleClose }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.app);
  const audioStreamRef = useRef(null);
  const playingStreamIdRef = useRef(null);
  const zgRef = useRef(null);

  const [call_details] = useSelector((state) => state.audioCall.call_queue);
  const { incoming } = useSelector((state) => state.audioCall);
  const { token } = useSelector((state) => state.auth);

  const [isMuted, setIsMuted] = useState(false);
  const [callStatus, setCallStatus] = useState("Connecting...");

  const roomID = call_details?.roomID || call_details?.call_id;
  const userID = (call_details?.userID || user?._id || "").toString();
  const userName =
    call_details?.userName ||
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    "User";
  const streamID = call_details?.streamID;

  // The other participant
  const otherUser = incoming
    ? call_details?.from_user
    : call_details?.to_user || call_details?.from_user;
  const otherUserName = otherUser
    ? `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim()
    : incoming
    ? "Caller"
    : "Friend";
  const otherUserAvatar = otherUser?.avatar;

  const myStreamID = `audio_${roomID}_${userID}`;

  // Initialize Zego instance once
  if (!zgRef.current && typeof window !== "undefined") {
    try {
      zgRef.current = new ZegoExpressEngine(ZEGO_APP_ID, ZEGO_SERVER);
    } catch (e) {
      console.error("ZegoExpressEngine audio init error:", e);
    }
  }
  const zg = zgRef.current;

  const handleDisconnect = (event, reason) => {
    if (reason && reason === "backdropClick") {
      return;
    }

    try {
      socket?.emit("audio_call_denied", {
        ...call_details,
        call_id: roomID,
        roomID,
      });
    } catch (e) {
      console.warn("Socket emit error:", e);
    }

    dispatch(ResetAudioCallQueue());

    // clean up event listeners
    socket?.off("audio_call_accepted");
    socket?.off("audio_call_denied");
    socket?.off("audio_call_missed");

    try {
      if (zg) {
        if (myStreamID) {
          try {
            zg.stopPublishingStream(myStreamID);
          } catch (e) {}
        }
        if (playingStreamIdRef.current) {
          try {
            zg.stopPlayingStream(playingStreamIdRef.current);
          } catch (e) {}
          playingStreamIdRef.current = null;
        }
        if (audioStreamRef.current) {
          try {
            zg.destroyStream(audioStreamRef.current);
          } catch (e) {}
          audioStreamRef.current = null;
        }
        if (roomID) {
          try {
            zg.logoutRoom(roomID);
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn("Zego audio cleanup error:", e);
    }

    if (typeof handleClose === "function") {
      handleClose();
    }
  };

  const handleToggleMute = () => {
    if (audioStreamRef.current && zg) {
      const nextMuted = !isMuted;
      zg.mutePublishStreamAudio(audioStreamRef.current, nextMuted);
      setIsMuted(nextMuted);
    }
  };

  useEffect(() => {
    if (!open || !roomID || !userID) return;

    // 30 sec auto-decline timer for caller
    const timer = setTimeout(() => {
      if (!incoming) {
        socket?.emit("audio_call_not_picked", {
          to: streamID,
          from: userID,
          roomID,
          call_id: roomID,
        });
        handleDisconnect();
      }
    }, 30 * 1000);

    socket?.on("audio_call_missed", () => {
      handleDisconnect();
    });

    socket?.on("audio_call_accepted", () => {
      clearTimeout(timer);
      setCallStatus("Connected");
    });

    socket?.on("audio_call_denied", () => {
      handleDisconnect();
    });

    if (!incoming) {
      socket?.emit("start_audio_call", {
        to: streamID,
        from: userID,
        roomID,
      });
      setCallStatus("Ringing...");
    } else {
      setCallStatus("Connected");
    }

    // Setup Zego Cloud WebRTC
    const setupCall = async () => {
      if (!zg || !roomID || !userID) return;

      try {
        const authToken =
          token ||
          (typeof window !== "undefined"
            ? window.localStorage.getItem("token") ||
              window.localStorage.getItem("accessToken")
            : "");

        const response = await axiosInstance.post(
          "/user/generate-zego-token",
          {
            userId: userID,
            room_id: roomID,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        const this_token = response?.data?.token;

        // Login to room
        await zg.loginRoom(
          roomID,
          this_token,
          { userID, userName },
          { userUpdate: true }
        );

        // Create local audio stream
        const localStream = await zg.createStream({
          camera: { audio: true, video: false },
        });

        audioStreamRef.current = localStream;

        // Publish local stream
        zg.startPublishingStream(myStreamID, localStream);

        // Listen for remote streams
        zg.on("roomStreamUpdate", async (rID, updateType, streamList) => {
          if (updateType === "ADD" && streamList && streamList.length > 0) {
            for (const stream of streamList) {
              if (stream.streamID === myStreamID) continue;
              try {
                const remoteStream = await zg.startPlayingStream(
                  stream.streamID
                );
                playingStreamIdRef.current = stream.streamID;
                const remoteAudio = document.getElementById("remote-audio");
                if (remoteAudio) {
                  remoteAudio.srcObject = remoteStream;
                  remoteAudio
                    .play()
                    .catch((err) => console.log("remote audio play err:", err));
                }
                setCallStatus("In Call");
              } catch (err) {
                console.error("Failed to play remote audio stream:", err);
              }
            }
          } else if (updateType === "DELETE" && streamList) {
            for (const stream of streamList) {
              try {
                zg.stopPlayingStream(stream.streamID);
              } catch (e) {}
            }
            handleDisconnect();
          }
        });

        zg.on("roomUserUpdate", (rID, updateType) => {
          if (updateType === "DELETE") {
            handleDisconnect();
          }
        });
      } catch (err) {
        console.error("Audio call setup error:", err);
      }
    };

    setupCall();

    return () => {
      clearTimeout(timer);
      socket?.off("audio_call_accepted");
      socket?.off("audio_call_denied");
      socket?.off("audio_call_missed");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, roomID, userID]);

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
          <Typography variant="overline" color="text.secondary">
            {callStatus}
          </Typography>

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
                    e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                      otherUserName || "User"
                    )}`;
                  },
                }}
              >
                {(otherUserName || "U")[0]}
              </Avatar>
              <Typography variant="subtitle2">{otherUserName}</Typography>
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
                    e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                      user?.firstName || "User"
                    )}`;
                  },
                }}
              >
                {(user?.firstName || "Y")[0]}
              </Avatar>
              <Typography variant="subtitle2">
                {user?.firstName || "You"}
              </Typography>
            </Stack>
          </Stack>

          {/* Hidden audio element for remote stream */}
          <audio id="remote-audio" autoPlay playsInline />

          {/* Call Controls */}
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton
              onClick={handleToggleMute}
              color={isMuted ? "error" : "primary"}
              sx={{ border: "1px solid", borderColor: "divider" }}
            >
              {isMuted ? <MicrophoneSlash size={22} /> : <Microphone size={22} />}
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