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
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ResetVideoCallQueue,
  UpdateVideoCallDialog,
} from "../../../redux/slices/videoCall";
import { socket } from "../../../socket";
import getAvatarUrl from "../../../utils/getAvatarUrl";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const CallNotification = ({ open, handleClose }) => {
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.app);
  const [call_details] = useSelector((state) => state.videoCall.call_queue);

  const caller = call_details?.from_user;
  const callerName = caller
    ? `${caller.firstName || ""} ${caller.lastName || ""}`.trim()
    : "Friend";

  const handleAccept = () => {
    socket?.emit("video_call_accepted", { ...call_details });
    dispatch(UpdateVideoCallDialog({ state: true }));
    if (typeof handleClose === "function") {
      handleClose();
    }
  };

  const handleDeny = () => {
    socket?.emit("video_call_denied", { ...call_details });
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
      sx={{ "& .MuiDialog-paper": { m: { xs: 1.5, sm: 2 } } }}
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
                    e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                      callerName || "User"
                    )}`;
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
                    e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                      user?.firstName || "User"
                    )}`;
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