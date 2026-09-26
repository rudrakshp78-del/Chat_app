import React from "react";

import {
  Avatar,
  Badge,
  Box,
  Divider,
  Fade,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  styled,
  Typography,
} from "@mui/material";

import { useTheme } from "@mui/material/styles";

import {
  CaretDown,
  CaretLeft,
  MagnifyingGlass,
  Phone,
  VideoCamera,
  X,
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
import {
  CloseSearch,
  SetSearchQuery,
  ToggleSearch,
} from "../../redux/slices/Conversation";
import getAvatarUrl from "../../utils/getAvatarUrl";
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

const Conversation_Menu = [
  { title: "Contact info" },
  { title: "Mute notifications" },
  { title: "Clear messages" },
  { title: "Delete chat" },
];

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

  const [conversationMenuAnchorEl, setConversationMenuAnchorEl] =
    React.useState(null);

  const openConversationMenu = Boolean(conversationMenuAnchorEl);

  const handleClickConversationMenu = (event) => {
    setConversationMenuAnchorEl(event.currentTarget);
  };

  const handleCloseConversationMenu = () => {
    setConversationMenuAnchorEl(null);
  };

  const current_user_id =
    useSelector((state) => state.auth?.user_id) ||
    (typeof window !== "undefined" ? window.localStorage.getItem("user_id") : null);

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
                  e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                    current_conversation?.name || "User"
                  )}`;
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

            <Typography variant="caption" noWrap>
              {current_conversation?.online ? "Online" : "Offline"}
            </Typography>
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
              {Conversation_Menu.map((el) => (
                <MenuItem
                  key={el.title}
                  onClick={
                    el.title === "Contact info"
                      ? handleContactInfo
                      : handleCloseConversationMenu
                  }
                >
                  {el.title}
                </MenuItem>
              ))}
            </Box>
          </Menu>
        </Stack>
      </Stack>

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