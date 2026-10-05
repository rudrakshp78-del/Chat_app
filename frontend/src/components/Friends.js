import React from "react";
import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme, styled } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import StyledBadge from "./StyledBadge";
import { socket } from "../socket";
import {
  BellSlash,
  Chat,
  Check,
  Clock,
  DotsThreeVertical,
  Eye,
  Handshake,
  Infinity as InfinityIcon,
} from "phosphor-react";
import getAvatarUrl from "../utils/getAvatarUrl";
import { showSnackbar } from "../redux/slices/app";
import {
  getChatRetentionMode,
  setChatRetentionMode,
  getRetentionInfo,
  getFriendNickname,
} from "../utils/chatSettingsHelpers";
import {
  isConversationMuted,
  muteConversation,
  unmuteConversation,
} from "../utils/muteHelpers";
import {
  ChatRetentionDialog,
  ManageFriendshipDialog,
} from "./PersonSettingsDialogs";

const StyledChatBox = styled(Box)(({ theme }) => ({
  "&:hover": {
    cursor: "pointer",
  },
}));

const UserComponent = ({
  firstName,
  lastName,
  _id,
  online,
  img,
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const name = `${firstName || ""} ${lastName || ""}`.trim() || "User";

  const handleFollow = () => {
    const user_id = localStorage.getItem("user_id");

    if (!user_id) {
      console.error("User ID not found");
      return;
    }

    if (!socket) {
      console.error("Socket is not connected");
      return;
    }

    socket.emit(
      "friend_request",
      {
        to: _id,
        from: user_id,
      },
      () => {
        dispatch(
          showSnackbar({
            severity: "success",
            message: `Friend request sent to ${name}`,
          })
        );
      }
    );
  };

  return (
    <StyledChatBox
      sx={{
        width: "100%",
        borderRadius: 1,
        backgroundColor: theme.palette.background.paper,
      }}
      p={2}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          {online ? (
            <StyledBadge
              overlap="circular"
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              variant="dot"
            >
              <Avatar alt={name} src={getAvatarUrl(img, name)} />
            </StyledBadge>
          ) : (
            <Avatar alt={name} src={getAvatarUrl(img, name)} />
          )}

          <Stack spacing={0.3}>
            <Typography variant="subtitle2">
              {name}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            sx={{
              color: "#111",
              backgroundColor: "#fff",
            }}
            onClick={handleFollow}
          >
            Follow
          </Button>
        </Stack>
      </Stack>
    </StyledChatBox>
  );
};

const FriendRequestComponent = ({
  firstName,
  lastName,
  online,
  img,
  id,
}) => {
  const theme = useTheme();
  const name = `${firstName || ""} ${lastName || ""}`.trim() || "User";

  const handleAcceptRequest = () => {
    if (!socket) {
      console.error("Socket is not connected");
      return;
    }

    socket.emit("accept_request", {
      request_id: id,
    });
  };

  return (
    <StyledChatBox
      sx={{
        width: "100%",
        borderRadius: 1,
        backgroundColor: theme.palette.background.paper,
      }}
      p={2}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          {online ? (
            <StyledBadge
              overlap="circular"
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              variant="dot"
            >
              <Avatar alt={name} src={getAvatarUrl(img, name)} />
            </StyledBadge>
          ) : (
            <Avatar alt={name} src={getAvatarUrl(img, name)} />
          )}

          <Stack spacing={0.3}>
            <Typography variant="subtitle2">
              {name}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            sx={{
              color: "#111",
              backgroundColor: "#fff",
            }}
            onClick={handleAcceptRequest}
          >
            Accept Request
          </Button>
        </Stack>
      </Stack>
    </StyledChatBox>
  );
};

const FriendComponent = ({
  firstName,
  lastName,
  _id,
  online,
  status,
  img,
  avatar,
  onChat,
  handleClose,
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { conversations } = useSelector(
    (state) => state.conversation.direct_chat
  );

  const matchedConv = React.useMemo(() => {
    return (conversations || []).find(
      (c) =>
        c?.user_id?.toString() === _id?.toString() ||
        c?.id?.toString() === _id?.toString()
    );
  }, [conversations, _id]);

  const targetKey = matchedConv?.id || _id;
  const rawName = `${firstName || ""} ${lastName || ""}`.trim() || "User";
  const [nickname, setNickname] = React.useState(() =>
    getFriendNickname(targetKey)
  );
  const name = nickname || rawName;
  const isOnline = online || status === "Online";
  const avatarSrc = getAvatarUrl(img || avatar, name);

  const [retentionMode, setRetentionModeState] = React.useState(() =>
    getChatRetentionMode(targetKey)
  );
  const [isMuted, setIsMuted] = React.useState(() =>
    isConversationMuted(targetKey)
  );
  const [contextMenu, setContextMenu] = React.useState(null);
  const [openRetentionDialog, setOpenRetentionDialog] = React.useState(false);
  const [openFriendshipDialog, setOpenFriendshipDialog] = React.useState(false);

  const holdTimerRef = React.useRef(null);
  const rowRef = React.useRef(null);

  React.useEffect(() => {
    const sync = () => {
      setRetentionModeState(getChatRetentionMode(targetKey));
      setNickname(getFriendNickname(targetKey));
      setIsMuted(isConversationMuted(targetKey));
    };
    window.addEventListener("chat_retention_changed", sync);
    window.addEventListener("friendship_updated", sync);
    window.addEventListener("conversation_mute_changed", sync);
    return () => {
      window.removeEventListener("chat_retention_changed", sync);
      window.removeEventListener("friendship_updated", sync);
      window.removeEventListener("conversation_mute_changed", sync);
    };
  }, [targetKey]);

  const clearHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const startHold = (clientX, clientY) => {
    clearHold();
    holdTimerRef.current = setTimeout(() => {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(35);
      }
      const rect = rowRef.current?.getBoundingClientRect();
      setContextMenu({
        mouseX: clientX || (rect ? rect.left + rect.width / 2 : 160),
        mouseY: clientY || (rect ? rect.top + rect.height / 2 : 200),
      });
    }, 800);
  };

  const handleQuickRetention = (modeKey) => {
    setContextMenu(null);
    setChatRetentionMode(targetKey, modeKey);
    setRetentionModeState(modeKey);
    const info = getRetentionInfo(modeKey);
    dispatch(
      showSnackbar({
        severity: "success",
        message: `${info.badge} Chat with ${name} set to: ${info.label}`,
      })
    );
  };

  const handleToggleMute = () => {
    setContextMenu(null);
    if (isMuted) {
      unmuteConversation(targetKey);
      setIsMuted(false);
      dispatch(
        showSnackbar({
          severity: "success",
          message: `Notifications unmuted for ${name}`,
        })
      );
    } else {
      muteConversation(targetKey, "always");
      setIsMuted(true);
      dispatch(
        showSnackbar({
          severity: "info",
          message: `Notifications muted for ${name}`,
        })
      );
    }
  };

  const retentionInfo = getRetentionInfo(retentionMode);

  return (
    <>
      <StyledChatBox
        ref={rowRef}
        onContextMenu={(e) => {
          e.preventDefault();
          clearHold();
          setContextMenu({ mouseX: e.clientX + 2, mouseY: e.clientY - 6 });
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) startHold(t.clientX, t.clientY);
        }}
        onTouchEnd={clearHold}
        onTouchMove={clearHold}
        onTouchCancel={clearHold}
        onMouseDown={(e) => {
          if (e.button === 0) startHold(e.clientX, e.clientY);
        }}
        onMouseUp={clearHold}
        onMouseLeave={clearHold}
        sx={{
          width: "100%",
          borderRadius: 1,
          userSelect: "none",
          backgroundColor: theme.palette.background.paper,
        }}
        p={2}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            {isOnline ? (
              <StyledBadge
                overlap="circular"
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                variant="dot"
              >
                <Avatar alt={name} src={avatarSrc} />
              </StyledBadge>
            ) : (
              <Avatar alt={name} src={avatarSrc} />
            )}

            <Stack spacing={0.2}>
              <Typography variant="subtitle2">{name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {retentionInfo.badge} {retentionInfo.shortLabel}
                {isMuted ? " • 🔕 Muted" : ""}
              </Typography>
            </Stack>
          </Stack>

          <Stack direction={"row"} spacing={1} alignItems={"center"}>
            <IconButton
              onClick={() => {
                const current_user_id = window.localStorage.getItem("user_id");
                if (!current_user_id) {
                  console.error("User ID not found in localStorage");
                  return;
                }

                if (!socket.connected) {
                  socket.io.opts.query = { user_id: current_user_id };
                  socket.connect();
                }

                // start a new conversation
                socket.emit("start_conversation", {
                  to: _id,
                  from: current_user_id,
                });

                if (typeof handleClose === "function") {
                  handleClose();
                }
                if (typeof onChat === "function") {
                  onChat();
                }
              }}
              title="Start Chat"
            >
              <Chat />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setContextMenu({
                  mouseX: e.clientX,
                  mouseY: e.clientY,
                });
              }}
              title="More options (Hold 1-2s on person)"
            >
              <DotsThreeVertical size={20} />
            </IconButton>
          </Stack>
        </Stack>
      </StyledChatBox>

      {/* Hold (1-2s) / Right-click Menu on Person ID */}
      <Menu
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        PaperProps={{
          sx: { minWidth: 235, borderRadius: 2.5, py: 0.5 },
        }}
      >
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
            fontSize: 10,
          }}
        >
          Delete Chats ({name})
        </Typography>

        <MenuItem
          onClick={() => handleQuickRetention("after_viewing")}
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
          onClick={() => handleQuickRetention("24_hours")}
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
          onClick={() => handleQuickRetention("permanent")}
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

        <Divider sx={{ my: 0.5 }} />

        <MenuItem
          onClick={() => {
            setContextMenu(null);
            setOpenFriendshipDialog(true);
          }}
          sx={{ display: "flex", gap: 1.5 }}
        >
          <Handshake size={18} />
          <Typography variant="body2" fontWeight={600}>
            Manage Friendship
          </Typography>
        </MenuItem>

        <MenuItem onClick={handleToggleMute} sx={{ display: "flex", gap: 1.5 }}>
          <BellSlash size={18} />
          <Typography variant="body2">
            {isMuted ? "Unmute notifications" : "Mute notifications"}
          </Typography>
        </MenuItem>
      </Menu>

      <ChatRetentionDialog
        open={openRetentionDialog}
        onClose={() => setOpenRetentionDialog(false)}
        conversationId={targetKey}
        personName={name}
      />

      <ManageFriendshipDialog
        open={openFriendshipDialog}
        onClose={() => setOpenFriendshipDialog(false)}
        conversationId={targetKey}
        userId={_id}
        personName={rawName}
        personImg={img || avatar}
        online={isOnline}
        onOpenRetentionDialog={() => setOpenRetentionDialog(true)}
      />
    </>
  );
};

export {
  UserComponent,
  FriendRequestComponent,
  FriendComponent,
};
