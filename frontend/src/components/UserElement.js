import React from "react";
import {
  Box,
  Badge,
  Stack,
  Avatar,
  Typography,
  IconButton,
  Button,
  Menu,
  MenuItem,
  Divider,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
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
import { useDispatch, useSelector } from "react-redux";
import { socket } from "../socket";
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

const UserElement = ({ img, firstName, lastName, online, _id }) => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const name = `${firstName || ""} ${lastName || ""}`.trim() || "User";

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
        alignItems={"center"}
        justifyContent="space-between"
      >
        <Stack direction="row" alignItems={"center"} spacing={2}>
          {online ? (
            <StyledBadge
              overlap="circular"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              variant="dot"
            >
              <Avatar alt={name} src={img} />
            </StyledBadge>
          ) : (
            <Avatar alt={name} src={img} />
          )}
          <Stack spacing={0.3}>
            <Typography variant="subtitle2">{name}</Typography>
          </Stack>
        </Stack>
        <Stack direction={"row"} spacing={2} alignItems={"center"}>
          <Button
            onClick={() => {
              const current_user_id = window.localStorage.getItem("user_id");
              if (!current_user_id) {
                console.error("User ID not found in localStorage");
                return;
              }
              socket.emit("friend_request", { to: _id, from: current_user_id }, () => {
                dispatch(
                  showSnackbar({
                    severity: "success",
                    message: `Friend request sent to ${name}`,
                  })
                );
              });
            }}
          >
            Send Request
          </Button>
        </Stack>
      </Stack>
    </StyledChatBox>
  );
};

const FriendRequestElement = ({
  img,
  firstName,
  lastName,
  incoming,
  missed,
  online,
  id,
}) => {
  const theme = useTheme();

  const name = `${firstName || ""} ${lastName || ""}`.trim() || "User";

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
        alignItems={"center"}
        justifyContent="space-between"
      >
        <Stack direction="row" alignItems={"center"} spacing={2}>
          {online ? (
            <StyledBadge
              overlap="circular"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              variant="dot"
            >
              <Avatar alt={name} src={img} />
            </StyledBadge>
          ) : (
            <Avatar alt={name} src={img} />
          )}
          <Stack spacing={0.3}>
            <Typography variant="subtitle2">{name}</Typography>
          </Stack>
        </Stack>
        <Stack direction={"row"} spacing={2} alignItems={"center"}>
          <Button
            onClick={() => {
              socket.emit("accept_request", { request_id: id });
            }}
          >
            Accept Request
          </Button>
        </Stack>
      </Stack>
    </StyledChatBox>
  );
};

// FriendElement with 1-2s Long-Press Options (Chat 24h / After Viewing / Permanently, Mute, Manage Friendship)
const FriendElement = ({
  img,
  firstName,
  lastName,
  incoming,
  missed,
  online,
  _id,
  handleClose,
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { conversations } = useSelector(
    (state) => state.conversation.direct_chat
  );

  // Match conversation ID for this friend if one exists, otherwise fallback to _id
  const matchedConv = React.useMemo(() => {
    return (conversations || []).find(
      (c) =>
        c?.user_id?.toString() === _id?.toString() ||
        c?.id?.toString() === _id?.toString()
    );
  }, [conversations, _id]);

  const targetKey = matchedConv?.id || _id;
  const rawName = `${firstName || ""} ${lastName || ""}`.trim() || "Friend";
  const [nickname, setNickname] = React.useState(() =>
    getFriendNickname(targetKey)
  );
  const displayName = nickname || rawName;

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
        message: `${info.badge} Chat with ${displayName} set to: ${info.label}`,
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
          message: `Notifications unmuted for ${displayName}`,
        })
      );
    } else {
      muteConversation(targetKey, "always");
      setIsMuted(true);
      dispatch(
        showSnackbar({
          severity: "info",
          message: `Notifications muted for ${displayName}`,
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
          alignItems={"center"}
          justifyContent="space-between"
        >
          <Stack direction="row" alignItems={"center"} spacing={2}>
            {online ? (
              <StyledBadge
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                variant="dot"
              >
                <Avatar alt={displayName} src={img} />
              </StyledBadge>
            ) : (
              <Avatar alt={displayName} src={img} />
            )}
            <Stack spacing={0.2}>
              <Typography variant="subtitle2">{displayName}</Typography>
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
                socket.emit("start_conversation", {
                  to: _id,
                  from: current_user_id,
                });
                if (typeof handleClose === "function") {
                  handleClose();
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
          Delete Chats ({displayName})
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
        personName={displayName}
      />

      <ManageFriendshipDialog
        open={openFriendshipDialog}
        onClose={() => setOpenFriendshipDialog(false)}
        conversationId={targetKey}
        userId={_id}
        personName={rawName}
        personImg={img}
        online={online}
        onOpenRetentionDialog={() => setOpenRetentionDialog(true)}
      />
    </>
  );
};

export { UserElement, FriendRequestElement, FriendElement };