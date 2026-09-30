import React, { useState } from "react";
import { useTheme } from "@mui/material/styles";
import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  Typography,
  Slide,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Radio,
  RadioGroup,
  FormControl,
  FormControlLabel,
} from "@mui/material";
import { DEFAULT_USER_AVATAR, getMockAvatar } from "../../utils/getAvatarUrl";
import {
  Bell,
  CaretRight,
  Phone,
  Prohibit,
  Star,
  Trash,
  VideoCamera,
  X,
  ArrowSquareOut,
} from "phosphor-react";
import { getPlatformInfo, renderPlatformIcon } from "../../utils/profileHelpers";
import { isConversationMuted, muteConversation, unmuteConversation } from "../../utils/muteHelpers";
import useResponsive from "../../hooks/useResponsive";
import AntSwitch from "../../components/AntSwitch";
import { useDispatch, useSelector } from "react-redux";
import { socket } from "../../socket";
import {
  SelectConversation,
  showSnackbar,
  ToggleSidebar,
  UpdateSidebarType,
} from "../../redux/slices/app";
import { DeleteDirectConversation } from "../../redux/slices/Conversation";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const BlockDialog = ({ open, handleClose }) => {
  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={handleClose}
      aria-describedby="alert-dialog-slide-description"
    >
      <DialogTitle>Block this contact</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-slide-description">
          Are you sure you want to block this Contact?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleClose}>Yes</Button>
      </DialogActions>
    </Dialog>
  );
};

const DeleteChatDialog = ({ open, handleClose }) => {
  const dispatch = useDispatch();
  const { current_conversation } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { room_id } = useSelector((state) => state.app);
  const authUserId = useSelector((state) => state.auth?.user_id);
  const current_user_id = authUserId || window.localStorage.getItem("user_id");

  const handleDelete = () => {
    const convId = current_conversation?.id || room_id;
    if (convId) {
      socket.emit("delete_chat", {
        conversation_id: convId,
        user_id: current_user_id,
      });
      dispatch(DeleteDirectConversation({ conversation_id: convId }));
      dispatch(SelectConversation({ room_id: null }));
      dispatch(ToggleSidebar());
      dispatch(
        showSnackbar({
          severity: "success",
          message: "Chat deleted on your device",
        })
      );
    }
    handleClose();
  };

  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={handleClose}
      aria-describedby="alert-dialog-slide-description"
    >
      <DialogTitle>Delete this chat?</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-slide-description">
          Are you sure you want to delete this chat? This chat and its messages
          will be deleted from your device only. The other person will still
          have their chat.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={handleDelete}>
          Delete chat
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Contact = () => {
  const dispatch = useDispatch();

  const {current_conversation} = useSelector((state) => state.conversation.direct_chat);

  const theme = useTheme();

  const isDesktop = useResponsive("up", "md");

  const [openBlock, setOpenBlock] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  const activeConvId = current_conversation?.id || current_conversation?._id;
  const [isMuted, setIsMuted] = React.useState(() => isConversationMuted(activeConvId));
  const [openMuteDialog, setOpenMuteDialog] = useState(false);
  const [muteDuration, setMuteDuration] = useState("always");

  React.useEffect(() => {
    setIsMuted(isConversationMuted(activeConvId));
  }, [activeConvId]);

  React.useEffect(() => {
    const handleMuteChange = (e) => {
      if (e.detail?.conversation_id?.toString() === activeConvId?.toString()) {
        setIsMuted(e.detail.isMuted);
      }
    };
    window.addEventListener("conversation_mute_changed", handleMuteChange);
    return () => {
      window.removeEventListener("conversation_mute_changed", handleMuteChange);
    };
  }, [activeConvId]);

  const handleToggleMute = (e) => {
    if (isMuted) {
      unmuteConversation(activeConvId);
      setIsMuted(false);
      dispatch(
        showSnackbar({
          severity: "success",
          message: "Notifications unmuted",
        })
      );
    } else {
      setOpenMuteDialog(true);
    }
  };

  const handleConfirmMute = () => {
    if (!activeConvId) return;
    muteConversation(activeConvId, muteDuration);
    setIsMuted(true);
    setOpenMuteDialog(false);
    const label =
      muteDuration === "8_hours"
        ? "8 hours"
        : muteDuration === "1_week"
        ? "1 week"
        : "Always";
    dispatch(
      showSnackbar({
        severity: "info",
        message: `Notifications muted for ${label}`,
      })
    );
  };

  const handleCloseBlock = () => {
    setOpenBlock(false);
  };
  const handleCloseDelete = () => {
    setOpenDelete(false);
  };

  return (
    <Box sx={{ width: !isDesktop ? "100vw" : 320, maxHeight: "100vh" }}>
      <Stack sx={{ height: "100%" }}>
        <Box
          sx={{
            boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
            width: "100%",
            backgroundColor:
              theme.palette.mode === "light"
                ? "#F8FAFF"
                : theme.palette.background,
          }}
        >
          <Stack
            sx={{ height: "100%", p: 2 }}
            direction="row"
            alignItems={"center"}
            justifyContent="space-between"
            spacing={3}
          >
            <Typography variant="subtitle2">Contact Info</Typography>
            <IconButton
              onClick={() => {
                dispatch(ToggleSidebar());
              }}
            >
              <X />
            </IconButton>
          </Stack>
        </Box>
        <Stack
          sx={{
            height: "100%",
            position: "relative",
            flexGrow: 1,
            overflow: "scroll",
          }}
          p={3}
          spacing={3}
        >
          <Stack alignItems="center" direction="row" spacing={2}>
            <Avatar
              src={current_conversation?.img || DEFAULT_USER_AVATAR}
              alt={current_conversation?.name || "User"}
              imgProps={{
                onError: (e) => {
                  e.currentTarget.src = DEFAULT_USER_AVATAR;
                },
              }}
              sx={{ height: 64, width: 64 }}
            >
              {(current_conversation?.name || "U")[0]}
            </Avatar>
            <Stack spacing={0.5}>
              <Typography variant="article" fontWeight={600}>
                {current_conversation?.name}
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {"+91 62543 28 739"}
              </Typography>
            </Stack>
          </Stack>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent={"space-evenly"}
          >
            <Stack alignItems={"center"} spacing={1}>
              <IconButton>
                <Phone />
              </IconButton>

              <Typography variant="overline">Voice</Typography>
            </Stack>
            <Stack alignItems={"center"} spacing={1}>
              <IconButton>
                <VideoCamera />
              </IconButton>
              <Typography variant="overline">Video</Typography>
            </Stack>
          </Stack>
          <Divider />
          <Stack spacing={0.5}>
            <Typography variant="article" fontWeight={600}>
              About
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {current_conversation?.about || "Hey there! I am using WhatsApp."}
            </Typography>
          </Stack>
          <Divider />
          {/* Contact Links */}
          {current_conversation?.links && current_conversation.links.length > 0 && (
            <>
              <Stack spacing={1}>
                <Typography variant="article" fontWeight={600}>
                  Links ({current_conversation.links.length})
                </Typography>
                <Stack spacing={1}>
                  {current_conversation.links.map((link, idx) => {
                    const platform = getPlatformInfo(link.url, link.title);
                    return (
                      <Stack
                        key={idx}
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                        component="a"
                        href={
                          link.url?.startsWith("http")
                            ? link.url
                            : `https://${link.url}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          textDecoration: "none",
                          p: 1.25,
                          borderRadius: 1.5,
                          border: "1px solid",
                          borderColor: theme.palette.divider,
                          bgcolor:
                            theme.palette.mode === "light"
                              ? "#F8FAFF"
                              : theme.palette.background.paper,
                          color: "inherit",
                          transition: "all 0.2s ease-in-out",
                          "&:hover": {
                            bgcolor:
                              theme.palette.mode === "light"
                                ? "#EEF2F6"
                                : "rgba(255, 255, 255, 0.08)",
                            transform: "translateY(-1px)",
                            borderColor: theme.palette.primary.main,
                          },
                        }}
                      >
                        <Box
                          sx={{
                            p: 0.8,
                            borderRadius: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor:
                              theme.palette.mode === "light"
                                ? "#fff"
                                : "rgba(255,255,255,0.08)",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                          }}
                        >
                          {renderPlatformIcon(platform.icon, 20)}
                        </Box>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="subtitle2" noWrap fontWeight={600}>
                            {link.title || platform.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ display: "block" }}
                          >
                            {link.url}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          sx={{ p: 0.5, color: "text.secondary" }}
                        >
                          <ArrowSquareOut size={16} />
                        </IconButton>
                      </Stack>
                    );
                  })}
                </Stack>
              </Stack>
              <Divider />
            </>
          )}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent={"space-between"}
          >
            <Typography variant="subtitle2">Media, Links & Docs</Typography>
            <Button
              onClick={() => {
                dispatch(UpdateSidebarType("SHARED"));
              }}
              endIcon={<CaretRight />}
            >
              401
            </Button>
          </Stack>
          <Stack direction={"row"} alignItems="center" spacing={2}>
            {[1, 2, 3].map((el) => (
              <Box key={el}>
                <img
                  src={getMockAvatar(`city-${el}`)}
                  alt="Shared media"
                  style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }}
                />
              </Box>
            ))}
          </Stack>
          <Divider />
          <Stack
            direction="row"
            alignItems="center"
            justifyContent={"space-between"}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Star size={21} />
              <Typography variant="subtitle2">Starred Messages</Typography>
            </Stack>

            <IconButton
              onClick={() => {
                dispatch(UpdateSidebarType("STARRED"));
              }}
            >
              <CaretRight />
            </IconButton>
          </Stack>
          <Divider />
          <Stack
            direction="row"
            alignItems="center"
            justifyContent={"space-between"}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Bell size={21} />
              <Typography variant="subtitle2">Mute Notifications</Typography>
            </Stack>

            <AntSwitch checked={isMuted} onChange={handleToggleMute} />
          </Stack>
          <Divider />
          <Typography variant="body2">1 group in common</Typography>
          <Stack direction="row" alignItems={"center"} spacing={2}>
            <Avatar src={DEFAULT_USER_AVATAR} alt="Camel's Gang" />
            <Stack direction="column" spacing={0.5}>
              <Typography variant="subtitle2">Camel’s Gang</Typography>
              <Typography variant="caption">
                Owl, Parrot, Rabbit , You
              </Typography>
            </Stack>
          </Stack>
          <Divider />
          <Stack direction="row" alignItems={"center"} spacing={2}>
            <Button
              onClick={() => {
                setOpenBlock(true);
              }}
              fullWidth
              startIcon={<Prohibit />}
              variant="outlined"
            >
              Block
            </Button>
            <Button
              onClick={() => {
                setOpenDelete(true);
              }}
              fullWidth
              startIcon={<Trash />}
              variant="outlined"
            >
              Delete
            </Button>
          </Stack>
        </Stack>
      </Stack>
      {openBlock && <BlockDialog open={openBlock} handleClose={handleCloseBlock} />}
      {openDelete && <DeleteChatDialog open={openDelete} handleClose={handleCloseDelete} />}
      {openMuteDialog && (
        <Dialog
          open={openMuteDialog}
          onClose={() => setOpenMuteDialog(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ pb: 1 }}>
            Mute notifications for {current_conversation?.name || "this contact"}?
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Other participants will not see that you muted this chat. You will still
              receive messages silently without sounds or popups.
            </DialogContentText>
            <FormControl component="fieldset">
              <RadioGroup
                value={muteDuration}
                onChange={(e) => setMuteDuration(e.target.value)}
              >
                <FormControlLabel
                  value="8_hours"
                  control={<Radio size="small" />}
                  label="8 Hours"
                />
                <FormControlLabel
                  value="1_week"
                  control={<Radio size="small" />}
                  label="1 Week"
                />
                <FormControlLabel
                  value="always"
                  control={<Radio size="small" />}
                  label="Always"
                />
              </RadioGroup>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenMuteDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleConfirmMute}>
              Mute
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default Contact;