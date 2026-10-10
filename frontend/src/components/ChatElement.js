import React from "react";
import {
  Box,
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Menu,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Avatar,
  Typography,
} from "@mui/material";
import { styled, useTheme, alpha } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArchiveBox,
  ArrowBendUpLeft,
  BellSlash,
  Check,
  Checks,
  Clock,
  Eraser,
  Eye,
  Handshake,
  Infinity as InfinityIcon,
  PushPin,
  Trash,
  User,
} from "phosphor-react";
import {
  CloseSidebar,
  SelectConversation,
  ToggleSidebar,
  UpdateSidebarType,
  showSnackbar,
} from "../redux/slices/app";
import {
  SetCurrentConversation,
  DeleteDirectConversation,
  ClearDirectMessages,
  SetReplyingTo,
} from "../redux/slices/Conversation";
import { socket } from "../socket";
import getAvatarUrl, { DEFAULT_USER_AVATAR } from "../utils/getAvatarUrl";
import {
  isConversationMuted,
  muteConversation,
  unmuteConversation,
} from "../utils/muteHelpers";
import {
  getChatRetentionMode,
  setChatRetentionMode,
  getRetentionInfo,
  getFriendNickname,
  isFriendPinned,
  toggleFriendPinned,
} from "../utils/chatSettingsHelpers";
import {
  ChatRetentionDialog,
  ManageFriendshipDialog,
} from "./PersonSettingsDialogs";

const truncateText = (string, n) => {
  return string?.length > n ? `${string?.slice(0, n)}...` : string;
};

const StyledChatBox = styled(Box)(() => ({
  "&:hover": {
    cursor: "pointer",
  },
}));

const StyledBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: "#44b700",
    color: "#44b700",
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    "&::after": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      animation: "ripple 1.2s infinite ease-in-out",
      border: "1px solid currentColor",
      content: '""',
    },
  },
  "@keyframes ripple": {
    "0%": {
      transform: "scale(.8)",
      opacity: 1,
    },
    "100%": {
      transform: "scale(2.4)",
      opacity: 0,
    },
  },
}));

const CHAT_HOLD_DURATION_MS = 800; // ~1 second hold to open all 3-dot options
const CHAT_SWIPE_THRESHOLD = 48;

const ChatElement = ({
  img,
  name,
  msg,
  time,
  unread,
  online,
  id,
  user_id,
  about,
  last_msg_outgoing,
  last_msg_status,
}) => {
  const dispatch = useDispatch();
  const { room_id, sideBar } = useSelector((state) => state.app);
  const selectedChatId = room_id?.toString();
  const isSelected = Boolean(
    selectedChatId && id && selectedChatId === id.toString()
  );
  const authUserId = useSelector((state) => state.auth.user_id);
  const current_user_id = authUserId || window.localStorage.getItem("user_id");

  const chatBoxRef = React.useRef(null);
  const holdTimerRef = React.useRef(null);
  const gestureRef = React.useRef({
    active: false,
    startX: 0,
    startY: 0,
    swiping: false,
    longPressed: false,
  });

  const [contextMenu, setContextMenu] = React.useState(null);
  const [openDeleteModal, setOpenDeleteModal] = React.useState(false);
  const [openClearModal, setOpenClearModal] = React.useState(false);
  const [openMuteModal, setOpenMuteModal] = React.useState(false);
  const [muteDuration, setMuteDuration] = React.useState("always");
  const [openRetentionDialog, setOpenRetentionDialog] = React.useState(false);
  const [openFriendshipDialog, setOpenFriendshipDialog] = React.useState(false);

  const [swipeOffset, setSwipeOffset] = React.useState(0);
  const [isSwiping, setIsSwiping] = React.useState(false);

  const [isMuted, setIsMuted] = React.useState(() => isConversationMuted(id));
  const [retentionMode, setRetentionModeState] = React.useState(() =>
    getChatRetentionMode(id)
  );
  const [nickname, setNicknameState] = React.useState(() =>
    getFriendNickname(id)
  );
  const [isPinned, setIsPinnedState] = React.useState(() => isFriendPinned(id));

  React.useEffect(() => {
    setIsMuted(isConversationMuted(id));
    setRetentionModeState(getChatRetentionMode(id));
    setNicknameState(getFriendNickname(id));
    setIsPinnedState(isFriendPinned(id));
  }, [id]);

  React.useEffect(() => {
    const handleMuteChange = (e) => {
      if (e.detail?.conversation_id?.toString() === id?.toString()) {
        setIsMuted(e.detail.isMuted);
      }
    };
    const handleRetentionChange = (e) => {
      if (e.detail?.conversation_id?.toString() === id?.toString()) {
        setRetentionModeState(e.detail.mode);
      }
    };
    const handleFriendshipUpdate = () => {
      setNicknameState(getFriendNickname(id));
      setIsPinnedState(isFriendPinned(id));
    };
    window.addEventListener("conversation_mute_changed", handleMuteChange);
    window.addEventListener("chat_retention_changed", handleRetentionChange);
    window.addEventListener("friendship_updated", handleFriendshipUpdate);
    return () => {
      window.removeEventListener("conversation_mute_changed", handleMuteChange);
      window.removeEventListener(
        "chat_retention_changed",
        handleRetentionChange
      );
      window.removeEventListener("friendship_updated", handleFriendshipUpdate);
    };
  }, [id]);

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  React.useEffect(() => {
    return () => clearHoldTimer();
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const displayName = nickname || name;

  const selectThisChat = () => {
    if (sideBar?.open) {
      dispatch(CloseSidebar());
    }
    dispatch(SelectConversation({ room_id: id }));
    dispatch(
      SetCurrentConversation({
        id,
        user_id,
        name: displayName,
        online,
        img,
        msg,
        time,
        unread,
        about,
      })
    );
    if (location.pathname.toLowerCase() !== "/app") {
      navigate("/app");
    }
  };

  const triggerReplyToChat = () => {
    selectThisChat();
    if (msg) {
      dispatch(
        SetReplyingTo({
          id: `chat-${id}`,
          message: msg,
          incoming: !last_msg_outgoing,
        })
      );
    }
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("focus_chat_input"));
    }, 120);
  };

  const startGesture = (clientX, clientY) => {
    clearHoldTimer();
    gestureRef.current = {
      active: true,
      startX: clientX,
      startY: clientY,
      swiping: false,
      longPressed: false,
    };

    holdTimerRef.current = setTimeout(() => {
      if (gestureRef.current.active && !gestureRef.current.swiping) {
        gestureRef.current.longPressed = true;
        gestureRef.current.active = false;
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(35);
        }
        const rect = chatBoxRef.current?.getBoundingClientRect();
        setContextMenu({
          mouseX: clientX || (rect ? rect.left + rect.width / 2 : 120),
          mouseY: clientY || (rect ? rect.top + rect.height / 2 : 200),
        });
      }
    }, CHAT_HOLD_DURATION_MS);
  };

  const moveGesture = (clientX, clientY) => {
    if (!gestureRef.current.active) return;

    const dx = clientX - gestureRef.current.startX;
    const dy = clientY - gestureRef.current.startY;

    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      clearHoldTimer();
    }

    // Slide right on chat item to reply (like WhatsApp)
    if (dx > 10 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      gestureRef.current.swiping = true;
      setIsSwiping(true);
      const damped = Math.min(72, (dx - 10) * 0.75);
      setSwipeOffset(damped);
    }
  };

  const endGesture = () => {
    clearHoldTimer();
    if (gestureRef.current.swiping) {
      if (swipeOffset >= CHAT_SWIPE_THRESHOLD) {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(25);
        }
        triggerReplyToChat();
      }
    }
    gestureRef.current.active = false;
    setTimeout(() => {
      gestureRef.current.swiping = false;
      gestureRef.current.longPressed = false;
    }, 60);
    setIsSwiping(false);
    setSwipeOffset(0);
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearHoldTimer();
    gestureRef.current.longPressed = true;
    gestureRef.current.active = false;
    setContextMenu(
      contextMenu === null
        ? { mouseX: event.clientX + 2, mouseY: event.clientY - 6 }
        : null
    );
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleContactInfoClick = (e) => {
    if (e) e.stopPropagation();
    handleCloseContextMenu();
    selectThisChat();
    dispatch(UpdateSidebarType("CONTACT"));
    if (!sideBar?.open) {
      dispatch(ToggleSidebar());
    }
  };

  const handleReplyMenuClick = (e) => {
    e.stopPropagation();
    handleCloseContextMenu();
    triggerReplyToChat();
  };

  const handleQuickRetentionSelect = (e, modeKey) => {
    e.stopPropagation();
    handleCloseContextMenu();
    setChatRetentionMode(id, modeKey);
    setRetentionModeState(modeKey);
    const info = getRetentionInfo(modeKey);
    dispatch(
      showSnackbar({
        severity: "success",
        message: `${info.badge} Chat with ${displayName} set to: ${info.label}`,
      })
    );
  };

  const handleOpenRetentionClick = (e) => {
    e.stopPropagation();
    handleCloseContextMenu();
    setOpenRetentionDialog(true);
  };

  const handleOpenFriendshipClick = (e) => {
    e.stopPropagation();
    handleCloseContextMenu();
    setOpenFriendshipDialog(true);
  };

  const handleTogglePinClick = (e) => {
    e.stopPropagation();
    handleCloseContextMenu();
    const nextPinned = toggleFriendPinned(id);
    setIsPinnedState(nextPinned);
    dispatch(
      showSnackbar({
        severity: "info",
        message: nextPinned
          ? `📌 Pinned ${displayName} as Best Friend`
          : `Unpinned ${displayName}`,
      })
    );
  };

  const handleMuteMenuClick = (e) => {
    e.stopPropagation();
    handleCloseContextMenu();
    if (isMuted) {
      unmuteConversation(id);
      setIsMuted(false);
      dispatch(
        showSnackbar({
          severity: "success",
          message: "Notifications unmuted",
        })
      );
    } else {
      setOpenMuteModal(true);
    }
  };

  const handleConfirmMute = (e) => {
    if (e) e.stopPropagation();
    if (!id) return;
    muteConversation(id, muteDuration);
    setIsMuted(true);
    setOpenMuteModal(false);
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

  const [isArchived, setIsArchived] = React.useState(() => {
    try {
      const archived = JSON.parse(
        localStorage.getItem("trackon_archived_chats") || "[]"
      );
      return Boolean(id && archived.includes(String(id)));
    } catch {
      return false;
    }
  });

  const handleArchiveMenuClick = (e) => {
    e.stopPropagation();
    handleCloseContextMenu();
    if (!id) return;
    try {
      const archived = JSON.parse(
        localStorage.getItem("trackon_archived_chats") || "[]"
      );
      const key = String(id);
      let next;
      if (archived.includes(key)) {
        next = archived.filter((item) => item !== key);
        setIsArchived(false);
        dispatch(
          showSnackbar({
            severity: "success",
            message: "Chat unarchived",
          })
        );
      } else {
        next = Array.from(new Set([...archived, key]));
        setIsArchived(true);
        dispatch(
          showSnackbar({
            severity: "info",
            message: "Chat archived",
          })
        );
      }
      localStorage.setItem("trackon_archived_chats", JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("archived_chats_updated"));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearChatClick = (e) => {
    e.stopPropagation();
    handleCloseContextMenu();
    setOpenClearModal(true);
  };

  const handleConfirmClearChat = (e) => {
    if (e) e.stopPropagation();
    if (!id) return;
    socket.emit("clear_chat", {
      conversation_id: id,
      user_id: current_user_id,
    });
    dispatch(ClearDirectMessages({ conversation_id: id }));
    dispatch(
      showSnackbar({
        severity: "success",
        message: "Chat cleared on your device",
      })
    );
    setOpenClearModal(false);
  };

  const handleDeleteChatClick = (e) => {
    e.stopPropagation();
    handleCloseContextMenu();
    setOpenDeleteModal(true);
  };

  const handleConfirmDelete = (e) => {
    if (e) e.stopPropagation();
    if (!id) return;

    socket.emit("delete_chat", {
      conversation_id: id,
      user_id: current_user_id,
    });

    try {
      const existingGroups = JSON.parse(
        localStorage.getItem("trackon_custom_groups") || "[]"
      );
      if (Array.isArray(existingGroups)) {
        const nextGroups = existingGroups.filter(
          (g) => String(g?.id) !== String(id)
        );
        if (nextGroups.length !== existingGroups.length) {
          localStorage.setItem(
            "trackon_custom_groups",
            JSON.stringify(nextGroups)
          );
          window.dispatchEvent(new CustomEvent("groups_updated"));
        }
      }
    } catch (err) {
      console.error(err);
    }

    dispatch(DeleteDirectConversation({ conversation_id: id }));
    if (selectedChatId === id.toString()) {
      dispatch(SelectConversation({ room_id: null }));
    }

    dispatch(
      showSnackbar({
        severity: "success",
        message: "Chat deleted on your device",
      })
    );

    setOpenDeleteModal(false);
  };

  const theme = useTheme();
  const swipeProgress = Math.min(1, swipeOffset / CHAT_SWIPE_THRESHOLD);
  const isReadyToReply = swipeOffset >= CHAT_SWIPE_THRESHOLD;
  const retentionInfo = getRetentionInfo(retentionMode);

  return (
    <>
      <Box
        sx={{
          position: "relative",
          width: "100%",
          overflow: "hidden",
          borderRadius: 1,
          touchAction: "pan-y",
        }}
      >
        {/* WhatsApp Slide-to-Reply Indicator Icon behind Chat Row */}
        {swipeOffset > 0 && (
          <Box
            sx={{
              position: "absolute",
              left: 12,
              top: "50%",
              marginTop: "-17px",
              zIndex: 1,
              width: 34,
              height: 34,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: isReadyToReply
                ? theme.palette.primary.main
                : alpha(theme.palette.primary.main, 0.2),
              color: isReadyToReply ? "#fff" : theme.palette.primary.main,
              opacity: swipeProgress,
              transform: `scale(${0.65 + swipeProgress * 0.4})`,
              transition: "background-color 0.15s ease, color 0.15s ease",
              pointerEvents: "none",
            }}
          >
            <ArrowBendUpLeft size={18} weight="bold" />
          </Box>
        )}

        <StyledChatBox
          ref={chatBoxRef}
          onContextMenu={handleContextMenu}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            if (touch) startGesture(touch.clientX, touch.clientY);
          }}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            if (touch) moveGesture(touch.clientX, touch.clientY);
          }}
          onTouchEnd={endGesture}
          onTouchCancel={endGesture}
          onMouseDown={(e) => {
            if (e.button === 0) startGesture(e.clientX, e.clientY);
          }}
          onMouseMove={(e) => {
            if (gestureRef.current.active) moveGesture(e.clientX, e.clientY);
          }}
          onMouseUp={endGesture}
          onMouseLeave={endGesture}
          onClick={() => {
            if (gestureRef.current.longPressed || gestureRef.current.swiping) {
              return;
            }
            selectThisChat();
          }}
          sx={{
            position: "relative",
            zIndex: 2,
            width: "100%",
            borderRadius: 1,
            userSelect: "none",
            WebkitUserSelect: "none",
            transform:
              swipeOffset > 0 ? `translateX(${swipeOffset}px)` : "none",
            transition: isSwiping
              ? "none"
              : "transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)",
            backgroundColor: isSelected
              ? theme.palette.mode === "light"
                ? alpha(theme.palette.primary.main, 0.5)
                : theme.palette.primary.main
              : theme.palette.mode === "light"
              ? "#fff"
              : theme.palette.background.paper,
          }}
          p={2}
        >
          <Stack
            direction="row"
            alignItems={"center"}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={2} sx={{ minWidth: 0 }}>
              {online ? (
                <StyledBadge
                  overlap="circular"
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  variant="dot"
                >
                  <Avatar
                    alt={displayName}
                    src={getAvatarUrl(img, displayName)}
                    imgProps={{
                      onError: (e) => {
                        e.currentTarget.src = DEFAULT_USER_AVATAR;
                      },
                    }}
                  >
                    {(displayName || "U")[0]}
                  </Avatar>
                </StyledBadge>
              ) : (
                <Avatar
                  alt={displayName}
                  src={getAvatarUrl(img, displayName)}
                  imgProps={{
                    onError: (e) => {
                      e.currentTarget.src = DEFAULT_USER_AVATAR;
                    },
                  }}
                >
                  {(displayName || "U")[0]}
                </Avatar>
              )}
              <Stack spacing={0.3} sx={{ minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={0.6}>
                  <Typography variant="subtitle2" noWrap>
                    {displayName}
                  </Typography>
                  {isPinned && (
                    <PushPin
                      size={13}
                      weight="fill"
                      color={
                        isSelected ? "#fff" : theme.palette.primary.main
                      }
                      style={{ flexShrink: 0 }}
                    />
                  )}
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.4}>
                  {last_msg_outgoing &&
                    (last_msg_status === "seen" ? (
                      <Checks
                        size={15}
                        weight="bold"
                        style={{ color: "#53bdeb", flexShrink: 0 }}
                      />
                    ) : last_msg_status === "delivered" ? (
                      <Checks
                        size={15}
                        weight="bold"
                        style={{ color: "#8696a0", flexShrink: 0 }}
                      />
                    ) : (
                      <Check
                        size={15}
                        weight="bold"
                        style={{ color: "#8696a0", flexShrink: 0 }}
                      />
                    ))}
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{ color: "text.secondary" }}
                  >
                    {truncateText(msg, 20)}
                  </Typography>
                </Stack>
              </Stack>
            </Stack>
            <Stack spacing={0.8} alignItems={"flex-end"} sx={{ flexShrink: 0 }}>
              <Typography sx={{ fontWeight: 600 }} variant="caption">
                {time}
              </Typography>
              <Stack direction="row" spacing={0.6} alignItems="center">
                {retentionMode !== "permanent" && (
                  <Box
                    sx={{
                      px: 0.6,
                      py: 0.1,
                      borderRadius: 1,
                      fontSize: 10,
                      fontWeight: 700,
                      bgcolor: alpha(theme.palette.primary.main, 0.14),
                      color: isSelected ? "#fff" : "primary.main",
                      lineHeight: 1.3,
                    }}
                    title={`Delete chats: ${retentionInfo.label}`}
                  >
                    {retentionMode === "after_viewing" ? "👁️ View" : "🕒 24h"}
                  </Box>
                )}
                {isMuted && (
                  <BellSlash size={14} color="#8696a0" weight="bold" />
                )}
                <Badge
                  className="unread-count"
                  color="primary"
                  badgeContent={unread}
                />
              </Stack>
            </Stack>
          </Stack>
        </StyledChatBox>
      </Box>

      {/* Hold (1-2s) / Right-click Person ID & Chat Options Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        PaperProps={{
          sx: {
            minWidth: 250,
            borderRadius: 2.5,
            boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
            py: 0.5,
          },
        }}
      >
        {/* Person Header inside Hold Menu */}
        <Box sx={{ px: 2, py: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.2}>
            <Avatar
              src={getAvatarUrl(img, displayName)}
              alt={displayName}
              sx={{ width: 32, height: 32 }}
            >
              {(displayName || "U")[0]}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                {displayName}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", fontSize: 11 }}
              >
                {retentionInfo.badge} Timer: {retentionInfo.shortLabel}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Divider sx={{ my: 0.5 }} />

        {/* Chat Retention Direct Options: After Viewing, 24 Hours, Permanently */}
        <Typography
          variant="caption"
          sx={{
            px: 2,
            pt: 0.5,
            pb: 0.25,
            display: "block",
            color: "text.secondary",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            fontSize: 10,
          }}
        >
          Delete Chats (Timer)
        </Typography>

        <MenuItem
          onClick={(e) => handleQuickRetentionSelect(e, "after_viewing")}
          sx={{ display: "flex", justifyContent: "space-between", gap: 1.5 }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Eye size={18} />
            <Typography variant="body2">Chat: After Viewing</Typography>
          </Stack>
          {retentionMode === "after_viewing" && (
            <Check size={16} weight="bold" color={theme.palette.primary.main} />
          )}
        </MenuItem>

        <MenuItem
          onClick={(e) => handleQuickRetentionSelect(e, "24_hours")}
          sx={{ display: "flex", justifyContent: "space-between", gap: 1.5 }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Clock size={18} />
            <Typography variant="body2">Chat: 24 Hours</Typography>
          </Stack>
          {retentionMode === "24_hours" && (
            <Check size={16} weight="bold" color={theme.palette.primary.main} />
          )}
        </MenuItem>

        <MenuItem
          onClick={(e) => handleQuickRetentionSelect(e, "permanent")}
          sx={{ display: "flex", justifyContent: "space-between", gap: 1.5 }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <InfinityIcon size={18} />
            <Typography variant="body2">Chat: Permanently</Typography>
          </Stack>
          {retentionMode === "permanent" && (
            <Check size={16} weight="bold" color={theme.palette.primary.main} />
          )}
        </MenuItem>

        <MenuItem
          onClick={handleOpenRetentionClick}
          sx={{ display: "flex", gap: 1.5 }}
        >
          <Clock size={18} />
          <Typography variant="body2" color="primary.main" fontWeight={600}>
            Delete Chats Settings...
          </Typography>
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        {/* Manage Friendship & Notifications */}
        <MenuItem
          onClick={handleOpenFriendshipClick}
          sx={{ display: "flex", gap: 1.5 }}
        >
          <Handshake size={18} />
          <Typography variant="body2" fontWeight={600}>
            Manage Friendship
          </Typography>
        </MenuItem>

        <MenuItem onClick={handleMuteMenuClick} sx={{ display: "flex", gap: 1.5 }}>
          <BellSlash size={18} />
          <Typography variant="body2">
            {isMuted ? "Unmute notifications" : "Mute notifications"}
          </Typography>
        </MenuItem>

        <MenuItem
          onClick={handleTogglePinClick}
          sx={{ display: "flex", gap: 1.5 }}
        >
          <PushPin size={18} />
          <Typography variant="body2">
            {isPinned ? "Unpin Best Friend" : "Pin as Best Friend"}
          </Typography>
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        {/* Standard Chat Actions */}
        <MenuItem onClick={handleReplyMenuClick} sx={{ display: "flex", gap: 1.5 }}>
          <ArrowBendUpLeft size={18} />
          <Typography variant="body2">Reply</Typography>
        </MenuItem>

        <MenuItem
          onClick={handleContactInfoClick}
          sx={{ display: "flex", gap: 1.5 }}
        >
          <User size={18} />
          <Typography variant="body2">Contact info</Typography>
        </MenuItem>

        <MenuItem onClick={handleArchiveMenuClick} sx={{ display: "flex", gap: 1.5 }}>
          <ArchiveBox size={18} />
          <Typography variant="body2">
            {isArchived ? "Unarchive chat" : "Archive chat"}
          </Typography>
        </MenuItem>

        <MenuItem onClick={handleClearChatClick} sx={{ display: "flex", gap: 1.5 }}>
          <Eraser size={18} />
          <Typography variant="body2">Clear chat</Typography>
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        <MenuItem
          onClick={handleDeleteChatClick}
          sx={{ color: "error.main", display: "flex", gap: 1.5 }}
        >
          <Trash size={18} />
          <Typography variant="body2">Delete chat</Typography>
        </MenuItem>
      </Menu>

      {/* Delete Chats / Message Retention Dialog (After Viewing, 24 Hours, Permanently) */}
      <ChatRetentionDialog
        open={openRetentionDialog}
        onClose={() => setOpenRetentionDialog(false)}
        conversationId={id}
        personName={displayName}
      />

      {/* Manage Friendship Dialog */}
      <ManageFriendshipDialog
        open={openFriendshipDialog}
        onClose={() => setOpenFriendshipDialog(false)}
        conversationId={id}
        userId={user_id}
        personName={name}
        personImg={img}
        personAbout={about}
        online={online}
        onOpenContactInfo={() => handleContactInfoClick()}
        onOpenRetentionDialog={() => setOpenRetentionDialog(true)}
      />

      {/* Mute Notifications Dialog */}
      <Dialog
        open={openMuteModal}
        onClose={() => setOpenMuteModal(false)}
        maxWidth="xs"
        fullWidth
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle sx={{ pb: 1 }}>
          Mute notifications for {displayName || "this chat"}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Other participants will not see that you muted this chat. You will
            still receive messages silently without popup banners or sound
            chimes.
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
          <Button onClick={() => setOpenMuteModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmMute}>
            Mute
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear Chat Confirmation Dialog */}
      <Dialog
        open={openClearModal}
        onClose={() => setOpenClearModal(false)}
        maxWidth="xs"
        fullWidth
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>Clear this chat?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to clear messages in this chat with{" "}
            {displayName}? Messages will be deleted from your device only.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenClearModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmClearChat}
          >
            Clear chat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Chat Confirmation Dialog */}
      <Dialog
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        maxWidth="xs"
        fullWidth
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>Delete this chat?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this chat with {displayName}? This
            chat and its messages will be deleted from your device only. The
            other person will still have their chat.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
          >
            Delete chat
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChatElement;