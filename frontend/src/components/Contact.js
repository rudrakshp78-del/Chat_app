import React, { useState } from "react";

import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Slide,
  Radio,
  RadioGroup,
  FormControl,
  FormControlLabel,
} from "@mui/material";

import { useTheme } from "@mui/material/styles";

import {
  ArrowSquareOut,
  Bell,
  CaretRight,
  Phone,
  Prohibit,
  Star,
  Trash,
  VideoCamera,
  X,
} from "phosphor-react";

import { useDispatch, useSelector } from "react-redux";

import {
  CloseSidebar,
  SelectConversation,
  UpdateSidebarType,
  showSnackbar,
} from "../redux/slices/app";
import { StartAudioCall } from "../redux/slices/audioCall";
import { StartVideoCall } from "../redux/slices/videoCall";
import { socket } from "../socket";
import { DeleteDirectConversation } from "../redux/slices/Conversation";

import AntSwitch from "./AntSwitch";
import getAvatarUrl, { DEFAULT_USER_AVATAR, getMockAvatar } from "../utils/getAvatarUrl";
import { getPlatformInfo, renderPlatformIcon } from "../utils/profileHelpers";
import {
  isConversationMuted,
  muteConversation,
  unmuteConversation,
} from "../utils/muteHelpers";

const Transition = React.forwardRef(function Transtion(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />
})

const BlockDialog = ({ open, handleClose, isBlocked, onConfirmBlock, contactName }) => {
  return (
    <Dialog
        open={open}
        slots={{
          transition: Transition,
        }}
        keepMounted
        onClose={handleClose}
        aria-describedby="alert-dialog-slide-description"
        role="alertdialog"
      >
        <DialogTitle>
          {isBlocked ? `Unblock ${contactName || "this contact"}?` : `Block ${contactName || "this contact"}?`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-slide-description">
            {isBlocked
              ? "Are you sure you want to unblock this contact? They will be able to message and call you again."
              : "Are you sure you want to block this contact? Blocked contacts will no longer be able to call you or send you messages."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} autoFocus>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={isBlocked ? "primary" : "error"}
            onClick={onConfirmBlock}
          >
            {isBlocked ? "Unblock" : "Block"}
          </Button>
        </DialogActions>
      </Dialog>
  );
};

const DeleteDialog = ({ open, handleClose }) => {
  const dispatch = useDispatch();
  const { current_conversation } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { room_id } = useSelector((state) => state.app);
  const current_user_id = window.localStorage.getItem("user_id");

  const handleDelete = () => {
    const convId = current_conversation?.id || room_id;
    if (convId) {
      socket.emit("delete_chat", {
        conversation_id: convId,
        user_id: current_user_id,
      });
      dispatch(DeleteDirectConversation({ conversation_id: convId }));
      dispatch(SelectConversation({ room_id: null }));
      dispatch(CloseSidebar());
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
        slots={{
          transition: Transition,
        }}
        keepMounted
        onClose={handleClose}
        aria-describedby="alert-dialog-slide-description"
        role="alertdialog"
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
          <Button onClick={handleClose} autoFocus>
           Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete chat
          </Button>
        </DialogActions>
      </Dialog>
  );
};

const Contact = () => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const { current_conversation, conversations, current_messages = [] } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { room_id } = useSelector((state) => state.app);

  const current_user_id =
    useSelector((state) => state.auth?.user_id) ||
    (typeof window !== "undefined" ? window.localStorage.getItem("user_id") : null);

  const activeConvId = current_conversation?.id || current_conversation?._id || room_id;

  const [isMuted, setIsMuted] = useState(() => isConversationMuted(activeConvId));
  const [openMuteDialog, setOpenMuteDialog] = useState(false);
  const [muteDuration, setMuteDuration] = useState("always");

  const [isBlocked, setIsBlocked] = useState(() => {
    try {
      const blocked = JSON.parse(localStorage.getItem("trackon_blocked_contacts") || "[]");
      return Boolean(activeConvId && blocked.includes(String(activeConvId)));
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    setIsMuted(isConversationMuted(activeConvId));
    try {
      const blocked = JSON.parse(localStorage.getItem("trackon_blocked_contacts") || "[]");
      setIsBlocked(Boolean(activeConvId && blocked.includes(String(activeConvId))));
    } catch {
      setIsBlocked(false);
    }
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

  const handleToggleMute = () => {
    if (!activeConvId) return;
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

  const handleConfirmBlock = () => {
    try {
      const blocked = JSON.parse(localStorage.getItem("trackon_blocked_contacts") || "[]");
      const key = String(activeConvId || "");
      let next;
      if (isBlocked) {
        next = blocked.filter((id) => id !== key);
        setIsBlocked(false);
        dispatch(
          showSnackbar({
            severity: "success",
            message: `${current_conversation?.name || "Contact"} has been unblocked`,
          })
        );
      } else {
        next = key ? Array.from(new Set([...blocked, key])) : blocked;
        setIsBlocked(true);
        dispatch(
          showSnackbar({
            severity: "info",
            message: `${current_conversation?.name || "Contact"} has been blocked`,
          })
        );
      }
      localStorage.setItem("trackon_blocked_contacts", JSON.stringify(next));
    } catch (e) {
      console.error(e);
    }
    setOpenBlock(false);
  };

  const sharedMediaMessages = React.useMemo(() => {
    return (current_messages || []).filter((m) => {
      const sub = (m?.subtype || "").toLowerCase();
      return (sub === "img" || sub === "media") && (m?.img || m?.fileUrl);
    });
  }, [current_messages]);

  const sharedTotalCount = React.useMemo(() => {
    return (current_messages || []).filter((m) => {
      const sub = (m?.subtype || "").toLowerCase();
      if (sub === "img" || sub === "media" || sub === "doc" || sub === "link") {
        return true;
      }
      return typeof m?.message === "string" && /https?:\/\/\S+/i.test(m.message);
    }).length;
  }, [current_messages]);

  const targetUserId = React.useMemo(() => {
    if (current_conversation?.user_id) return current_conversation.user_id;

    if (
      current_conversation?._id &&
      current_conversation._id.toString() !== current_user_id?.toString() &&
      current_conversation._id.toString() !== room_id?.toString()
    ) {
      return current_conversation._id.toString();
    }

    if (Array.isArray(current_conversation?.participants)) {
      const other = current_conversation.participants.find(
        (p) => (p?._id || p)?.toString() !== current_user_id?.toString()
      );
      if (other) return (other?._id || other)?.toString();
    }

    const found = conversations?.find(
      (c) => c?.id?.toString() === room_id?.toString()
    );
    if (found?.user_id) return found.user_id;
    if (Array.isArray(found?.participants)) {
      const other = found.participants.find(
        (p) => (p?._id || p)?.toString() !== current_user_id?.toString()
      );
      if (other) return (other?._id || other)?.toString();
    }

    return room_id || null;
  }, [current_conversation, conversations, room_id, current_user_id]);

  const handleAudioCall = () => {
    if (!targetUserId) {
      dispatch(
        showSnackbar({
          severity: "warning",
          message: "Please select a conversation to start a call",
        })
      );
      return;
    }
    dispatch(StartAudioCall(targetUserId));
  };

  const handleVideoCall = () => {
    if (!targetUserId) {
      dispatch(
        showSnackbar({
          severity: "warning",
          message: "Please select a conversation to start a call",
        })
      );
      return;
    }
    dispatch(StartVideoCall(targetUserId));
  };

  const [openBlock, setOpenBlock] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  const handleCloseBlock = () => {
    setOpenBlock(false);
  };

  const handleCloseDelete = () => {
    setOpenDelete(false);
  };

  const handleCloseSidebar = () => {
    dispatch(CloseSidebar());
  };

  const handleSharedMessages = () => {
    dispatch(UpdateSidebarType("SHARED"));
  };

  const handleStarredMessages = () => {
    dispatch(UpdateSidebarType("STARRED"));
  };

  return (
    <Box
      sx={{
        width: { xs: "100%", md: 320 },
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <Stack sx={{ height: "100%" }}>
        {/* Header */}
        <Box
          sx={{
            boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
            width: "100%",
            backgroundColor:
              theme.palette.mode === "light"
                ? "#F8FAFF"
                : theme.palette.background.default,
          }}
        >
          <Stack
            sx={{ p: 2 }}
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="subtitle2">
              Contact Info
            </Typography>

            <IconButton onClick={handleCloseSidebar}>
              <X size={20} />
            </IconButton>
          </Stack>
        </Box>

        {/* Body */}
        <Stack
          sx={{
            flexGrow: 1,
            minHeight: 0,
            overflowY: "auto",
          }}
          p={3}
          spacing={3}
        >
          {/* Profile */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
          >
            <Avatar
              src={getAvatarUrl(
                current_conversation?.img,
                current_conversation?.name
              )}
              alt={current_conversation?.name || "User"}
              imgProps={{
                onError: (e) => {
                  e.currentTarget.src = DEFAULT_USER_AVATAR;
                },
              }}
              sx={{
                width: 64,
                height: 64,
              }}
            >
              {(current_conversation?.name || "U")[0]}
            </Avatar>

            <Stack spacing={0.5} sx={{ minWidth: 0, overflow: "hidden" }}>
              <Typography
                variant="subtitle1"
                fontWeight={600}
                noWrap
              >
                {current_conversation?.name || "User"}
              </Typography>

              <Typography
                variant="body2"
                fontWeight={500}
                color={current_conversation?.online ? "success.main" : "text.secondary"}
              >
                {current_conversation?.online ? "Online" : "Offline"}
              </Typography>
            </Stack>
          </Stack>

          {/* Voice / Video */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-evenly"
          >
            <Stack spacing={1} alignItems="center">
              <IconButton onClick={handleAudioCall} color="primary">
                <Phone size={21} />
              </IconButton>

              <Typography variant="overline">
                Voice
              </Typography>
            </Stack>

            <Stack spacing={1} alignItems="center">
              <IconButton onClick={handleVideoCall} color="primary">
                <VideoCamera size={21} />
              </IconButton>

              <Typography variant="overline">
                Video
              </Typography>
            </Stack>
          </Stack>

          <Divider />

          {/* About */}
          <Stack spacing={0.5}>
            <Typography variant="subtitle2" fontWeight={600}>
              About
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {current_conversation?.about || "Hey there! I am using Trackon."}
            </Typography>
          </Stack>

          <Divider />

          {/* Contact Links */}
          {Array.isArray(current_conversation?.links) &&
            current_conversation.links.length > 0 && (
              <>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" fontWeight={600}>
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

          {/* Media */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="subtitle2">
              Media, links & docs
            </Typography>

            <Button
              onClick={handleSharedMessages}
              endIcon={<CaretRight />}
            >
              {sharedTotalCount}
            </Button>
          </Stack>

          {/* Media Images */}
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
          >
            {sharedMediaMessages.length > 0
              ? sharedMediaMessages.slice(-3).map((m, idx) => (
                  <Box
                    key={m.id || idx}
                    onClick={handleSharedMessages}
                    sx={{ cursor: "pointer" }}
                  >
                    <img
                      src={m.img || m.fileUrl}
                      alt={m.message || `media-${idx}`}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        objectFit: "cover",
                      }}
                    />
                  </Box>
                ))
              : [1, 2, 3].map((el) => (
                  <Box
                    key={el}
                    onClick={handleSharedMessages}
                    sx={{ cursor: "pointer" }}
                  >
                    <img
                      src={getMockAvatar(`media-${el}`)}
                      alt={`media-${el}`}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        objectFit: "cover",
                      }}
                    />
                  </Box>
                ))}
          </Stack>

          <Divider />

          {/* Starred Messages */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
            >
              <Star size={21} />

              <Typography variant="subtitle2">
                Starred Messages
              </Typography>
            </Stack>

            <IconButton onClick={handleStarredMessages}>
              <CaretRight />
            </IconButton>
          </Stack>

          <Divider />

          {/* Mute Notifications */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
            >
              <Bell size={21} />

              <Typography variant="subtitle2">
                Mute Notifications
              </Typography>
            </Stack>

            <AntSwitch checked={isMuted} onChange={handleToggleMute} />
          </Stack>

          <Divider />

          {/* Common Group */}
          <Typography variant="body2">
            1 group in common
          </Typography>

          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
          >
            <Avatar
              src={getMockAvatar("Coding Monk")}
              alt="Coding Monk"
            />

            <Stack spacing={0.5}>
              <Typography variant="subtitle2">
                Coding Monk
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Owl, parrot, rabbit, you
              </Typography>
            </Stack>
          </Stack>

          {/* Actions */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
          >
            <Button
              onClick={() => {
                setOpenBlock(true);
              }}
              startIcon={<Prohibit />}
              fullWidth
              variant="outlined"
              color={isBlocked ? "warning" : "primary"}
            >
              {isBlocked ? "Unblock" : "Block"}
            </Button>

            <Button
              onClick={() => {
                setOpenDelete(true);
              }}
              startIcon={<Trash />}
              fullWidth
              variant="outlined"
              color="error"
            >
              Delete
            </Button>
          </Stack>
        </Stack>
      </Stack>
      {openBlock && (
        <BlockDialog
          open={openBlock}
          handleClose={handleCloseBlock}
          isBlocked={isBlocked}
          onConfirmBlock={handleConfirmBlock}
          contactName={current_conversation?.name}
        />
      )}
      {openDelete && <DeleteDialog open={openDelete} handleClose={handleCloseDelete} />}
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