import React from "react";

import {
  Avatar,
  Badge,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Fade,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  styled,
  Typography,
  Radio,
  RadioGroup,
  FormControl,
  FormControlLabel,
  Tooltip,
} from "@mui/material";

import { useTheme } from "@mui/material/styles";

import {
  CaretDown,
  CaretLeft,
  MagnifyingGlass,
  Phone,
  VideoCamera,
  X,
  BellSlash,
} from "phosphor-react";

import { useDispatch, useSelector } from "react-redux";

import useResponsive from "../../hooks/useResponsive";
import {
  SelectConversation,
  ToggleSidebar,
  UpdateSidebarType,
  showSnackbar,
} from "../../redux/slices/app";
import { StartAudioCall } from "../../redux/slices/audioCall";
import { StartVideoCall } from "../../redux/slices/videoCall";
import { socket } from "../../socket";
import {
  CloseSearch,
  SetSearchQuery,
  ToggleSearch,
  DeleteDirectConversation,
  ClearDirectMessages,
} from "../../redux/slices/Conversation";
import getAvatarUrl, { DEFAULT_USER_AVATAR } from "../../utils/getAvatarUrl";
import {
  isConversationMuted,
  muteConversation,
  unmuteConversation,
} from "../../utils/muteHelpers";
import {
  Search,
  SearchIconWrapper,
  StyledInputBase,
} from "../Search";

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

const Header = () => {
  const theme = useTheme();
  const isMobile = useResponsive("down", "md");

  const dispatch = useDispatch();
  const { current_conversation, open_search, search_query, current_messages } =
    useSelector((state) => state.conversation.direct_chat);
  const { conversations } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { room_id } = useSelector((state) => state.app);

  const activeConvId = room_id || current_conversation?.id || current_conversation?._id;
  const [isMuted, setIsMuted] = React.useState(() => isConversationMuted(activeConvId));
  const [openMuteDialog, setOpenMuteDialog] = React.useState(false);
  const [muteDuration, setMuteDuration] = React.useState("always");

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

  const [conversationMenuAnchorEl, setConversationMenuAnchorEl] =
    React.useState(null);
  const [openDeleteChat, setOpenDeleteChat] = React.useState(false);
  const [openClearChat, setOpenClearChat] = React.useState(false);

  const openConversationMenu = Boolean(conversationMenuAnchorEl);

  const handleClickConversationMenu = (event) => {
    setConversationMenuAnchorEl(event.currentTarget);
  };

  const handleCloseConversationMenu = () => {
    setConversationMenuAnchorEl(null);
  };

  const authUserId = useSelector((state) => state.auth?.user_id);
  const current_user_id =
    authUserId ||
    (typeof window !== "undefined" ? window.localStorage.getItem("user_id") : null);

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

  const handleUnmuteChat = () => {
    if (!activeConvId) return;
    unmuteConversation(activeConvId);
    setIsMuted(false);
    dispatch(
      showSnackbar({
        severity: "success",
        message: "Notifications unmuted",
      })
    );
  };

  const handleMenuItemClick = (title) => {
    handleCloseConversationMenu();
    if (title === "Contact info") {
      handleContactInfo();
    } else if (title === "Mute notifications") {
      setOpenMuteDialog(true);
    } else if (title === "Unmute notifications") {
      handleUnmuteChat();
    } else if (title === "Clear chat" || title === "Clear messages") {
      setOpenClearChat(true);
    } else if (title === "Delete chat" || title === "Delete message") {
      setOpenDeleteChat(true);
    }
  };

  const conversationMenuItems = [
    { title: "Contact info" },
    { title: isMuted ? "Unmute notifications" : "Mute notifications" },
    { title: "Clear chat" },
    { title: "Delete chat" },
  ];

  const handleConfirmClearChat = () => {
    const convId = room_id || current_conversation?.id || current_conversation?._id;
    if (!convId) return;
    socket.emit("clear_chat", {
      conversation_id: convId,
      user_id: current_user_id,
    });
    dispatch(ClearDirectMessages({ conversation_id: convId }));
    dispatch(
      showSnackbar({
        severity: "success",
        message: "Chat cleared on your device",
      })
    );
    setOpenClearChat(false);
  };

  const handleConfirmDeleteChat = () => {
    const convId = room_id || current_conversation?.id || current_conversation?._id;
    if (!convId) return;
    socket.emit("delete_chat", {
      conversation_id: convId,
      user_id: current_user_id,
    });
    dispatch(DeleteDirectConversation({ conversation_id: convId }));
    dispatch(SelectConversation({ room_id: null }));
    dispatch(
      showSnackbar({
        severity: "success",
        message: "Chat deleted on your device",
      })
    );
    setOpenDeleteChat(false);
  };

  // Resolve recipient user ID
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

  // VOICE CALL
  const handleAudioCall = () => {
    console.log("handleAudioCall:", { targetUserId, current_conversation, room_id });
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

  // VIDEO CALL
  const handleVideoCall = () => {
    console.log("handleVideoCall:", { targetUserId, current_conversation, room_id });
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

  // SEARCH TOGGLE
  const handleToggleSearch = () => {
    dispatch(ToggleSearch());
  };

  // CONTACT SIDEBAR
  const handleContactInfo = () => {
    dispatch(UpdateSidebarType("CONTACT"));
    dispatch(ToggleSidebar());
    setConversationMenuAnchorEl(null);
  };

  // Search match count
  const matchCount = React.useMemo(() => {
    if (!search_query?.trim()) return 0;
    const q = search_query.trim().toLowerCase();
    return (current_messages || []).filter(
      (m) => m?.message && m.message.toLowerCase().includes(q)
    ).length;
  }, [search_query, current_messages]);

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: 72,
        height: "auto",
        boxSizing: "border-box",

        backgroundColor:
          theme.palette.mode === "light"
            ? "#F8FAFF"
            : theme.palette.background.paper,

        boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",

        flexShrink: 0,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          width: "100%",
          height: 72,
          px: { xs: 1, sm: 2 },
          boxSizing: "border-box",
        }}
      >
        {/* USER & BACK BUTTON */}
        <Stack
          direction="row"
          spacing={isMobile ? 1 : 2}
          alignItems="center"
          sx={{
            minWidth: 0,
            flex: 1,
            mr: 1,
            cursor: "pointer",
          }}
          onClick={handleContactInfo}
        >
          {isMobile && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                dispatch(SelectConversation({ room_id: null }));
              }}
              sx={{ p: 0.5 }}
            >
              <CaretLeft size={24} />
            </IconButton>
          )}

          <StyledBadge
            overlap="circular"
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            variant={current_conversation?.online ? "dot" : "standard"}
          >
            <Avatar
              alt={current_conversation?.name || "User"}
              src={getAvatarUrl(
                current_conversation?.img,
                current_conversation?.name
              )}
              imgProps={{
                onError: (e) => {
                  e.currentTarget.src = DEFAULT_USER_AVATAR;
                },
              }}
              sx={{ width: { xs: 38, sm: 40 }, height: { xs: 38, sm: 40 } }}
            >
              {(current_conversation?.name || "U")[0]}
            </Avatar>
          </StyledBadge>

          <Stack spacing={0.2} sx={{ minWidth: 0, overflow: "hidden" }}>
            <Typography
              variant="subtitle2"
              noWrap
              sx={{ maxWidth: { xs: 110, sm: 220, md: 300 } }}
            >
              {current_conversation?.name || "Chat"}
            </Typography>

            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="caption" noWrap>
                {current_conversation?.online ? "Online" : "Offline"}
              </Typography>
              {isMuted && (
                <Tooltip title="Notifications muted">
                  <Box sx={{ display: "inline-flex", color: "text.secondary" }}>
                    <BellSlash size={13} weight="bold" />
                  </Box>
                </Tooltip>
              )}
            </Stack>
          </Stack>
        </Stack>

        {/* ACTIONS */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={isMobile ? 0.5 : 1}
          sx={{ flexShrink: 0 }}
        >
          <IconButton
            onClick={handleVideoCall}
            title="Video Call"
            sx={{
              p: { xs: 0.5, sm: 1 },
              color: theme.palette.primary.main,
            }}
          >
            <VideoCamera size={20} />
          </IconButton>

          <IconButton
            onClick={handleAudioCall}
            title="Voice Call"
            sx={{
              p: { xs: 0.5, sm: 1 },
              color: theme.palette.primary.main,
            }}
          >
            <Phone size={20} />
          </IconButton>

          <IconButton
            onClick={handleToggleSearch}
            title="Search Messages"
            sx={{
              p: { xs: 0.5, sm: 1 },
              color: open_search
                ? theme.palette.primary.main
                : theme.palette.text.secondary,
            }}
          >
            <MagnifyingGlass size={20} />
          </IconButton>

          <Divider orientation="vertical" flexItem sx={{ my: 1 }} />

          {/* MENU BUTTON */}
          <IconButton
            id="conversation-positioned-button"
            aria-controls={
              openConversationMenu
                ? "conversation-positioned-menu"
                : undefined
            }
            aria-haspopup="true"
            aria-expanded={
              openConversationMenu ? "true" : undefined
            }
            onClick={handleClickConversationMenu}
            sx={{ p: { xs: 0.5, sm: 1 } }}
          >
            <CaretDown size={20} />
          </IconButton>

          {/* MENU */}
          <Menu
            id="conversation-positioned-menu"
            anchorEl={conversationMenuAnchorEl}
            open={openConversationMenu}
            onClose={handleCloseConversationMenu}
            TransitionComponent={Fade}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
          >
            <Box p={1}>
              {conversationMenuItems.map((el) => (
                <MenuItem
                  key={el.title}
                  onClick={() => handleMenuItemClick(el.title)}
                  sx={
                    el.title === "Delete chat"
                      ? { color: "error.main" }
                      : undefined
                  }
                >
                  {el.title}
                </MenuItem>
              ))}
            </Box>
          </Menu>
        </Stack>
      </Stack>

      {/* Mute Notifications Dialog */}
      <Dialog
        open={openMuteDialog}
        onClose={() => setOpenMuteDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          Mute notifications for {current_conversation?.name || "this chat"}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Other participants will not see that you muted this chat. You will still
            receive messages silently without popup banners or sound chimes.
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

      {/* Clear Messages Dialog */}
      <Dialog
        open={openClearChat}
        onClose={() => setOpenClearChat(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Clear this chat?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to clear messages in this chat? Messages will be
            deleted from your device only. The other person will still see their messages.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenClearChat(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmClearChat}
          >
            Clear chat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Chat Dialog */}
      <Dialog
        open={openDeleteChat}
        onClose={() => setOpenDeleteChat(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete this chat?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this chat? This chat and its messages will
            be deleted from your device only. The other person will still have their chat.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteChat(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDeleteChat}
          >
            Delete chat
          </Button>
        </DialogActions>
      </Dialog>

      {/* SEARCH BAR ROW */}
      {open_search && (
        <Box
          sx={{
            px: { xs: 1.5, sm: 2 },
            pb: 1.5,
            pt: 0.5,
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ flex: 1 }}>
              <Search
                sx={{
                  width: "100%",
                  backgroundColor:
                    theme.palette.mode === "light"
                      ? "#fff"
                      : theme.palette.background.default,
                }}
              >
                <SearchIconWrapper>
                  <MagnifyingGlass color="#709CE6" size={18} />
                </SearchIconWrapper>
                <StyledInputBase
                  autoFocus
                  placeholder="Search messages in conversation..."
                  value={search_query || ""}
                  onChange={(e) => dispatch(SetSearchQuery(e.target.value))}
                  inputProps={{ "aria-label": "search messages" }}
                  sx={{ width: "100%" }}
                />
              </Search>
            </Box>

            {search_query && (
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {matchCount} {matchCount === 1 ? "match" : "matches"}
              </Typography>
            )}

            <IconButton
              size="small"
              onClick={() => dispatch(CloseSearch())}
              title="Close search"
              sx={{ p: 0.5 }}
            >
              <X size={18} />
            </IconButton>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default Header;