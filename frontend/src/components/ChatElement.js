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
import {
  ArrowBendUpLeft,
  BellSlash,
  Check,
  Checks,
  Eraser,
  Trash,
  User,
} from "phosphor-react";
import {
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

  const [swipeOffset, setSwipeOffset] = React.useState(0);
  const [isSwiping, setIsSwiping] = React.useState(false);

  const [isMuted, setIsMuted] = React.useState(() => isConversationMuted(id));

  React.useEffect(() => {
    setIsMuted(isConversationMuted(id));
  }, [id]);

  React.useEffect(() => {
    const handleMuteChange = (e) => {
      if (e.detail?.conversation_id?.toString() === id?.toString()) {
        setIsMuted(e.detail.isMuted);
      }
    };
    window.addEventListener("conversation_mute_changed", handleMuteChange);
    return () => {
      window.removeEventListener("conversation_mute_changed", handleMuteChange);
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

  const selectThisChat = () => {
    dispatch(SelectConversation({ room_id: id }));
    dispatch(
      SetCurrentConversation({
        id,
        user_id,
        name,
        online,
        img,
        msg,
        time,
        unread,
        about,
      })
    );
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
    e.stopPropagation();
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
            <Stack direction="row" spacing={2}>
              {online ? (
                <StyledBadge
                  overlap="circular"
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  variant="dot"
                >
                  <Avatar
                    alt={name}
                    src={getAvatarUrl(img, name)}
                    imgProps={{
                      onError: (e) => {
                        e.currentTarget.src = DEFAULT_USER_AVATAR;
                      },
                    }}
                  >
                    {(name || "U")[0]}
                  </Avatar>
                </StyledBadge>
              ) : (
                <Avatar
                  alt={name}
                  src={getAvatarUrl(img, name)}
                  imgProps={{
                    onError: (e) => {
                      e.currentTarget.src = DEFAULT_USER_AVATAR;
                    },
                  }}
                >
                  {(name || "U")[0]}
                </Avatar>
              )}
              <Stack spacing={0.3} sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" noWrap>
                  {name}
                </Typography>
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
            <Stack spacing={1} alignItems={"flex-end"}>
              <Typography sx={{ fontWeight: 600 }} variant="caption">
                {time}
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
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

      {/* Hold (1s) / Right-click All 3-Dot Chat Options Menu */}
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
            minWidth: 190,
            borderRadius: 2,
            boxShadow: "0 6px 20px rgba(0,0,0,0.16)",
          },
        }}
      >
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

        <MenuItem onClick={handleMuteMenuClick} sx={{ display: "flex", gap: 1.5 }}>
          <BellSlash size={18} />
          <Typography variant="body2">
            {isMuted ? "Unmute notifications" : "Mute notifications"}
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

      {/* Mute Notifications Dialog */}
      <Dialog
        open={openMuteModal}
        onClose={() => setOpenMuteModal(false)}
        maxWidth="xs"
        fullWidth
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle sx={{ pb: 1 }}>
          Mute notifications for {name || "this chat"}?
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
            Are you sure you want to clear messages in this chat with {name}?
            Messages will be deleted from your device only.
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
            Are you sure you want to delete this chat with {name}? This chat and
            its messages will be deleted from your device only. The other person
            will still have their chat.
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