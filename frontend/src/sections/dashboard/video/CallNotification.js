import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Slide,
  Stack,
  Typography,
} from "@mui/material";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ResetVideoCallQueue,
  UpdateVideoCallDialog,
} from "../../../redux/slices/videoCall";
import { showSnackbar } from "../../../redux/slices/app";
import { socket } from "../../../socket";
import getAvatarUrl, { DEFAULT_USER_AVATAR } from "../../../utils/getAvatarUrl";
import { resolveCallParticipants } from "../../../utils/webrtcConfig";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const CallNotification = ({ open, handleClose }) => {
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.app);
  const { user_id } = useSelector((state) => state.auth);
  const [call_details] = useSelector((state) => state.videoCall.call_queue);

  const { myUserID, remoteUserID, otherUser } = resolveCallParticipants(
    call_details,
    user,
    user_id
  );

  const caller = otherUser || call_details?.from_user;
  const callerName = caller
    ? `${caller.firstName || ""} ${caller.lastName || ""}`.trim()
    : "Friend";
  const roomID = call_details?.roomID || call_details?.call_id;

  useEffect(() => {
    if (!open) return;

    const handleRemoteCancel = (data) => {
      const eventRoom = data?.roomID || data?.call_id;
      if (eventRoom && roomID && eventRoom.toString() !== roomID.toString()) {
        return;
      }
      dispatch(ResetVideoCallQueue());
      dispatch(
        showSnackbar({
          severity: "info",
          message: `Missed video call from ${callerName}`,
        })
      );
      if (typeof handleClose === "function") {
        handleClose();
      }
    };

    socket?.on("video_call_denied", handleRemoteCancel);
    socket?.on("video_call_missed", handleRemoteCancel);
    socket?.on("webrtc_call_ended", handleRemoteCancel);

    return () => {
      socket?.off("video_call_denied", handleRemoteCancel);
      socket?.off("video_call_missed", handleRemoteCancel);
      socket?.off("webrtc_call_ended", handleRemoteCancel);
    };
  }, [open, roomID, callerName, dispatch, handleClose]);

  const handleAccept = () => {
    socket?.emit("video_call_accepted", {
      ...call_details,
      roomID,
      call_id: roomID,
      streamID: remoteUserID,
      userID: myUserID,
    });
    dispatch(UpdateVideoCallDialog({ state: true }));
    if (typeof handleClose === "function") {
      handleClose();
    }
  };

  const handleDeny = (event, reason) => {
    if (reason && (reason === "backdropClick" || reason === "escapeKeyDown")) {
      return;
    }
    socket?.emit("video_call_denied", {
      ...call_details,
      roomID,
      call_id: roomID,
      streamID: remoteUserID,
      userID: myUserID,
    });
    dispatch(ResetVideoCallQueue());
    if (typeof handleClose === "function") {
      handleClose();
    }
  };

  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={handleDeny}
      aria-describedby="alert-dialog-slide-description"
      sx={{ "& .MuiDialog-paper": { m: { xs: 1.5, sm: 2 }, minWidth: 300 } }}
    >
      <DialogContent>
        <Stack
          direction="column"
          alignItems="center"
          spacing={2}
          p={{ xs: 1, sm: 2 }}
        >
          <Stack
            direction="row"
            spacing={{ xs: 3, sm: 6 }}
            justifyContent="center"
            alignItems="center"
          >
            <Stack alignItems="center" spacing={1}>
              <Avatar
                sx={{ height: { xs: 72, sm: 100 }, width: { xs: 72, sm: 100 } }}
                src={getAvatarUrl(caller?.avatar, callerName)}
                imgProps={{
                  onError: (e) => {
                    e.currentTarget.src = DEFAULT_USER_AVATAR;
                  },
                }}
              >
                {(callerName || "C")[0]}
              </Avatar>
              <Typography variant="caption">{callerName}</Typography>
            </Stack>
            <Stack alignItems="center" spacing={1}>
              <Avatar
                sx={{ height: { xs: 72, sm: 100 }, width: { xs: 72, sm: 100 } }}
                src={getAvatarUrl(user?.avatar, user?.firstName)}
                imgProps={{
                  onError: (e) => {
                    e.currentTarget.src = DEFAULT_USER_AVATAR;
                  },
                }}
              >
                {(user?.firstName || "Y")[0]}
              </Avatar>
              <Typography variant="caption">
                {user?.firstName || "You"}
              </Typography>
            </Stack>
          </Stack>
          <Typography variant="subtitle1" fontWeight={600} textAlign="center">
            Incoming Video Call from {callerName}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "center", pb: 2, gap: 2 }}>
        <Button onClick={handleAccept} variant="contained" color="success">
          Accept
        </Button>
        <Button onClick={handleDeny} variant="contained" color="error">
          Deny
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CallNotification;