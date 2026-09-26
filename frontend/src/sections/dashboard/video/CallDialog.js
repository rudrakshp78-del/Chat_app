import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Slide,
  Stack,
  Typography,
  IconButton,
  Box,
} from "@mui/material";
import {
  Microphone,
  MicrophoneSlash,
  VideoCamera,
  VideoCameraSlash,
  PhoneDisconnect,
} from "phosphor-react";
import { ZegoExpressEngine } from "zego-express-engine-webrtc";
import { useDispatch, useSelector } from "react-redux";
import axiosInstance from "../../../utils/axios";
import { socket } from "../../../socket";
import { ResetVideoCallQueue } from "../../../redux/slices/videoCall";
import { ZEGO_APP_ID, ZEGO_SERVER } from "../../../config";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const CallDialog = ({ open, handleClose }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.app);

  const localStreamRef = useRef(null);
  const playingStreamIdRef = useRef(null);
  const zgRef = useRef(null);

  const [call_details] = useSelector((state) => state.videoCall.call_queue);
  const { incoming } = useSelector((state) => state.videoCall);
  const { token } = useSelector((state) => state.auth);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState("Connecting...");

  const roomID = call_details?.roomID || call_details?.call_id;
  const userID = (call_details?.userID || user?._id || "").toString();
  const userName =
    call_details?.userName ||
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    "User";
  const streamID = call_details?.streamID;

  // Other participant
  const otherUser = incoming
    ? call_details?.from_user
    : call_details?.to_user || call_details?.from_user;
  const otherUserName = otherUser
    ? `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim()
    : incoming
    ? "Caller"
    : "Friend";

  const myStreamID = `video_${roomID}_${userID}`;

  // Initialize Zego instance once
  if (!zgRef.current && typeof window !== "undefined") {
    try {
      zgRef.current = new ZegoExpressEngine(ZEGO_APP_ID, ZEGO_SERVER);
    } catch (e) {
      console.error("ZegoExpressEngine video init error:", e);
    }
  }
  const zg = zgRef.current;

  const handleDisconnect = (event, reason) => {
    if (reason && reason === "backdropClick") {
      return;
    }

    try {
      socket?.emit("video_call_denied", {
        ...call_details,
        call_id: roomID,
        roomID,
      });
    } catch (e) {
      console.warn("Socket emit error:", e);
    }

    dispatch(ResetVideoCallQueue());

    socket?.off("video_call_accepted");
    socket?.off("video_call_denied");
    socket?.off("video_call_missed");

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
        if (localStreamRef.current) {
          try {
            zg.destroyStream(localStreamRef.current);
          } catch (e) {}
          localStreamRef.current = null;
        }
        if (roomID) {
          try {
            zg.logoutRoom(roomID);
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn("Zego video cleanup error:", e);
    }

    if (typeof handleClose === "function") {
      handleClose();
    }
  };

  const handleToggleMute = () => {
    if (localStreamRef.current && zg) {
      const nextMuted = !isMuted;
      zg.mutePublishStreamAudio(localStreamRef.current, nextMuted);
      setIsMuted(nextMuted);
    }
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current && zg) {
      const nextVideoOff = !isVideoOff;
      zg.mutePublishStreamVideo(localStreamRef.current, nextVideoOff);
      setIsVideoOff(nextVideoOff);
    }
  };

  useEffect(() => {
    if (!open || !roomID || !userID) return;

    const timer = setTimeout(() => {
      if (!incoming) {
        socket?.emit("video_call_not_picked", {
          to: streamID,
          from: userID,
          roomID,
          call_id: roomID,
        });
        handleDisconnect();
      }
    }, 30 * 1000);

    socket?.on("video_call_missed", () => {
      handleDisconnect();
    });

    socket?.on("video_call_accepted", () => {
      clearTimeout(timer);
      setCallStatus("Connected");
    });

    socket?.on("video_call_denied", () => {
      handleDisconnect();
    });

    if (!incoming) {
      socket?.emit("start_video_call", {
        to: streamID,
        from: userID,
        roomID,
      });
      setCallStatus("Ringing...");
    } else {
      setCallStatus("Connected");
    }

    const setupVideoCall = async () => {
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

        // Single stream for both audio and video
        const localStream = await zg.createStream({
          camera: { audio: true, video: true },
        });

        localStreamRef.current = localStream;

        const localVideo = document.getElementById("local-video");
        if (localVideo) {
          localVideo.srcObject = localStream;
          localVideo
            .play()
            .catch((err) => console.log("local video play error:", err));
        }

        // Publish stream
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
                const remoteVideo = document.getElementById("remote-video");
                if (remoteVideo) {
                  remoteVideo.srcObject = remoteStream;
                  remoteVideo
                    .play()
                    .catch((err) =>
                      console.log("remote video play error:", err)
                    );
                }
                setCallStatus("In Call");
              } catch (err) {
                console.error("Failed to play remote video stream:", err);
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
        console.error("Video call setup error:", err);
      }
    };

    setupVideoCall();

    return () => {
      clearTimeout(timer);
      socket?.off("video_call_accepted");
      socket?.off("video_call_denied");
      socket?.off("video_call_missed");
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
      sx={{ "& .MuiDialog-paper": { m: { xs: 1.5, sm: 2 }, maxWidth: 640, width: "100%" } }}
    >
      <DialogContent>
        <Stack spacing={2} alignItems="center">
          <Typography variant="overline" color="text.secondary">
            {callStatus}
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 2, sm: 3 }}
            alignItems="center"
            justifyContent="center"
            sx={{ width: "100%" }}
          >
            {/* Local Video */}
            <Stack alignItems="center" spacing={1} sx={{ width: { xs: "100%", sm: "50%" } }}>
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
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: isVideoOff ? "none" : "block",
                  }}
                  id="local-video"
                  autoPlay
                  muted
                  playsInline
                />
                {isVideoOff && (
                  <Typography variant="caption" sx={{ color: "grey.500" }}>
                    Camera Off
                  </Typography>
                )}
              </Box>
              <Typography variant="subtitle2">You</Typography>
            </Stack>

            {/* Remote Video */}
            <Stack alignItems="center" spacing={1} sx={{ width: { xs: "100%", sm: "50%" } }}>
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
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                  id="remote-video"
                  autoPlay
                  playsInline
                />
              </Box>
              <Typography variant="subtitle2">{otherUserName}</Typography>
            </Stack>
          </Stack>

          {/* Call Controls */}
          <Stack direction="row" spacing={2} alignItems="center" pt={1}>
            <IconButton
              onClick={handleToggleMute}
              color={isMuted ? "error" : "primary"}
              sx={{ border: "1px solid", borderColor: "divider" }}
            >
              {isMuted ? <MicrophoneSlash size={22} /> : <Microphone size={22} />}
            </IconButton>

            <IconButton
              onClick={handleToggleVideo}
              color={isVideoOff ? "error" : "primary"}
              sx={{ border: "1px solid", borderColor: "divider" }}
            >
              {isVideoOff ? <VideoCameraSlash size={22} /> : <VideoCamera size={22} />}
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