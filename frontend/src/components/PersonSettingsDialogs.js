import React, { useState, useEffect } from "react";
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Radio,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useDispatch } from "react-redux";
import {
  BellSlash,
  Clock,
  PencilSimple,
  Prohibit,
  PushPin,
  User,
  UserMinus,
  WarningOctagon,
  X,
} from "phosphor-react";
import {
  RETENTION_MODES,
  getChatRetentionMode,
  setChatRetentionMode,
  getRetentionInfo,
  getFriendNickname,
  setFriendNickname,
  isFriendPinned,
  toggleFriendPinned,
  isPersonBlocked,
  togglePersonBlocked,
} from "../utils/chatSettingsHelpers";
import {
  isConversationMuted,
  muteConversation,
  unmuteConversation,
} from "../utils/muteHelpers";
import { SelectConversation, showSnackbar } from "../redux/slices/app";
import { DeleteDirectConversation } from "../redux/slices/Conversation";
import { socket } from "../socket";
import getAvatarUrl, { DEFAULT_USER_AVATAR } from "../utils/getAvatarUrl";

export const ChatRetentionDialog = ({
  open,
  onClose,
  conversationId,
  personName,
  onSaved,
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [selectedMode, setSelectedMode] = useState(() =>
    getChatRetentionMode(conversationId)
  );

  useEffect(() => {
    if (open) {
      setSelectedMode(getChatRetentionMode(conversationId));
    }
  }, [open, conversationId]);

  const handleSelect = (modeId) => {
    setSelectedMode(modeId);
    setChatRetentionMode(conversationId, modeId);
    const info = getRetentionInfo(modeId);
    if (onSaved) {
      onSaved(modeId, info);
    } else {
      dispatch(
        showSnackbar({
          severity: "success",
          message: `${info.badge} Chat with ${
            personName || "this person"
          } set to: ${info.label}`,
        })
      );
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      onClick={(e) => e.stopPropagation()}
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Clock size={22} weight="duotone" color={theme.palette.primary.main} />
          <Typography variant="subtitle1" fontWeight={700}>
            Delete Chats (Message Timer)
          </Typography>
        </Stack>
        <IconButton size="small" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0.5, pb: 2.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose when messages with{" "}
          <strong>{personName || "this person"}</strong> should be cleared:
        </Typography>

        <Stack spacing={1.25}>
          {RETENTION_MODES.map((mode) => {
            const isSelected = selectedMode === mode.id;
            return (
              <Box
                key={mode.id}
                onClick={() => handleSelect(mode.id)}
                sx={{
                  p: 1.5,
                  borderRadius: 2.5,
                  cursor: "pointer",
                  border: "1.5px solid",
                  borderColor: isSelected
                    ? theme.palette.primary.main
                    : theme.palette.divider,
                  bgcolor: isSelected
                    ? alpha(theme.palette.primary.main, 0.08)
                    : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    borderColor: theme.palette.primary.main,
                  },
                }}
              >
                <Box sx={{ pr: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {mode.badge} — {mode.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {mode.subtitle}
                  </Typography>
                </Box>
                <Radio checked={isSelected} size="small" />
              </Box>
            );
          })}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export const ManageFriendshipDialog = ({
  open,
  onClose,
  conversationId,
  personName,
  personAvatar,
  personImg,
  personAbout,
  isOnline,
  online,
  isMuted: propIsMuted,
  onOpenContactInfo,
  onOpenRetention,
  onOpenRetentionDialog,
  onToggleMute,
  onDeleteChat,
  onNotify,
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const resolvedAvatar = personAvatar || personImg;
  const resolvedOnline = Boolean(isOnline ?? online);
  const resolvedOpenRetention = onOpenRetention || onOpenRetentionDialog;

  const [nickname, setNickname] = useState("");
  const [editingNickname, setEditingNickname] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [retentionMode, setRetentionMode] = useState("permanent");

  useEffect(() => {
    if (open && conversationId) {
      setNickname(getFriendNickname(conversationId));
      setEditingNickname(false);
      setPinned(isFriendPinned(conversationId));
      setBlocked(isPersonBlocked(conversationId));
      setMuted(
        propIsMuted !== undefined
          ? propIsMuted
          : isConversationMuted(conversationId)
      );
      setRetentionMode(getChatRetentionMode(conversationId));
    }
  }, [open, conversationId, propIsMuted]);

  const notifyUser = (message, severity = "info") => {
    if (onNotify) {
      onNotify(message);
    } else {
      dispatch(showSnackbar({ severity, message }));
    }
  };

  const handleSaveNickname = () => {
    setFriendNickname(conversationId, nickname);
    setEditingNickname(false);
    notifyUser(
      nickname.trim()
        ? `Nickname updated to "${nickname.trim()}"`
        : "Nickname cleared",
      "success"
    );
  };

  const handleTogglePin = () => {
    const nowPinned = toggleFriendPinned(conversationId);
    setPinned(nowPinned);
    notifyUser(
      nowPinned
        ? `${personName || "Friend"} pinned to top of chats 📌`
        : `${personName || "Friend"} unpinned`,
      "info"
    );
  };

  const handleToggleMuteInternal = () => {
    if (onToggleMute) {
      onToggleMute();
      onClose();
      return;
    }
    if (!conversationId) return;
    if (muted) {
      unmuteConversation(conversationId);
      setMuted(false);
      notifyUser("Notifications unmuted", "success");
    } else {
      muteConversation(conversationId, "always");
      setMuted(true);
      notifyUser("Notifications muted", "info");
    }
  };

  const handleToggleBlock = () => {
    const nowBlocked = togglePersonBlocked(conversationId, personName);
    setBlocked(nowBlocked);
    notifyUser(
      nowBlocked
        ? `${personName || "Person"} has been blocked`
        : `${personName || "Person"} has been unblocked`,
      nowBlocked ? "warning" : "success"
    );
  };

  const handleRemoveAndDelete = () => {
    onClose();
    if (onDeleteChat) {
      onDeleteChat();
      return;
    }
    if (!conversationId) return;
    const current_user_id = window.localStorage.getItem("user_id");
    socket.emit("delete_chat", {
      conversation_id: conversationId,
      user_id: current_user_id,
    });
    dispatch(DeleteDirectConversation({ conversation_id: conversationId }));
    dispatch(SelectConversation({ room_id: null }));
    notifyUser(
      `Removed chat with ${personName || "this person"}`,
      "success"
    );
  };

  const handleReportPerson = () => {
    notifyUser(
      `Reported ${personName || "this user"} to Trackon safety team`,
      "info"
    );
    onClose();
  };

  const retentionInfo = getRetentionInfo(retentionMode);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      onClick={(e) => e.stopPropagation()}
      PaperProps={{
        sx: { borderRadius: 3, overflow: "hidden" },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Manage Friendship
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Profile Header Card */}
        <Stack
          alignItems="center"
          spacing={1}
          sx={{
            px: 3,
            py: 2,
            bgcolor:
              theme.palette.mode === "light"
                ? "#F8FAFF"
                : alpha(theme.palette.background.default, 0.5),
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Avatar
            src={getAvatarUrl(resolvedAvatar, personName)}
            alt={personName || "Friend"}
            imgProps={{
              onError: (e) => {
                e.currentTarget.src = DEFAULT_USER_AVATAR;
              },
            }}
            sx={{ width: 68, height: 68 }}
          >
            {(personName || "U")[0]}
          </Avatar>

          <Stack alignItems="center" spacing={0.25}>
            <Typography variant="subtitle1" fontWeight={700}>
              {nickname ? `${nickname} (${personName})` : personName || "User"}
            </Typography>
            <Typography
              variant="caption"
              color={resolvedOnline ? "success.main" : "text.secondary"}
              fontWeight={600}
            >
              {resolvedOnline ? "● Online" : "Offline"}
            </Typography>
            {personAbout && (
              <Typography
                variant="caption"
                color="text.secondary"
                align="center"
                sx={{ pt: 0.5 }}
              >
                {personAbout}
              </Typography>
            )}
          </Stack>

          {/* Edit Nickname inline */}
          {editingNickname ? (
            <Stack direction="row" spacing={1} sx={{ width: "100%", pt: 1 }}>
              <TextField
                size="small"
                fullWidth
                autoFocus
                placeholder="Enter custom nickname..."
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveNickname();
                }}
              />
              <Button variant="contained" size="small" onClick={handleSaveNickname}>
                Save
              </Button>
            </Stack>
          ) : (
            <Button
              size="small"
              variant="outlined"
              startIcon={<PencilSimple size={15} />}
              onClick={() => setEditingNickname(true)}
              sx={{ textTransform: "none", borderRadius: 99, mt: 0.5 }}
            >
              {nickname ? "Change Nickname" : "Set Friend Nickname"}
            </Button>
          )}
        </Stack>

        {/* Friendship & Chat Options List */}
        <List disablePadding>
          {onOpenContactInfo && (
            <ListItemButton
              onClick={() => {
                onClose();
                onOpenContactInfo();
              }}
            >
              <ListItemIcon sx={{ minWidth: 38 }}>
                <User size={20} />
              </ListItemIcon>
              <ListItemText
                primary="View Full Profile"
                secondary="See shared media, links, docs & bio"
              />
            </ListItemButton>
          )}

          <ListItemButton onClick={handleTogglePin}>
            <ListItemIcon sx={{ minWidth: 38 }}>
              <PushPin
                size={20}
                weight={pinned ? "fill" : "regular"}
                color={pinned ? theme.palette.primary.main : undefined}
              />
            </ListItemIcon>
            <ListItemText
              primary={pinned ? "Unpin Best Friend" : "Pin as Best Friend 📌"}
              secondary={
                pinned
                  ? "Currently pinned to top of your chats"
                  : "Keep this person at the top of your chat list"
              }
            />
          </ListItemButton>

          <ListItemButton
            onClick={() => {
              onClose();
              if (resolvedOpenRetention) resolvedOpenRetention();
            }}
          >
            <ListItemIcon sx={{ minWidth: 38 }}>
              <Clock size={20} />
            </ListItemIcon>
            <ListItemText
              primary="Delete Chats (Message Timer)"
              secondary={`Currently set to: ${retentionInfo.title}`}
            />
          </ListItemButton>

          <ListItemButton onClick={handleToggleMuteInternal}>
            <ListItemIcon sx={{ minWidth: 38 }}>
              <BellSlash size={20} />
            </ListItemIcon>
            <ListItemText
              primary={muted ? "Unmute Notifications" : "Mute Notifications"}
              secondary={
                muted ? "Notifications are muted" : "Silence message alerts"
              }
            />
          </ListItemButton>

          <Divider />

          <ListItemButton onClick={handleToggleBlock}>
            <ListItemIcon sx={{ minWidth: 38, color: "warning.main" }}>
              <Prohibit size={20} />
            </ListItemIcon>
            <ListItemText
              primary={blocked ? "Unblock Person" : "Block Person"}
              secondary={
                blocked
                  ? "Currently blocked — tap to allow messages & calls"
                  : "Prevent this person from calling or messaging you"
              }
              primaryTypographyProps={{ color: "warning.main", fontWeight: 600 }}
            />
          </ListItemButton>

          <ListItemButton onClick={handleRemoveAndDelete}>
            <ListItemIcon sx={{ minWidth: 38, color: "error.main" }}>
              <UserMinus size={20} />
            </ListItemIcon>
            <ListItemText
              primary="Remove Friend & Delete Chat"
              primaryTypographyProps={{ color: "error.main", fontWeight: 600 }}
            />
          </ListItemButton>

          <ListItemButton onClick={handleReportPerson}>
            <ListItemIcon sx={{ minWidth: 38, color: "error.main" }}>
              <WarningOctagon size={20} />
            </ListItemIcon>
            <ListItemText
              primary="Report Account"
              primaryTypographyProps={{ color: "error.main" }}
            />
          </ListItemButton>
        </List>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1 }}>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
};
