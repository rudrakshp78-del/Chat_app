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
} from "phosphor-react";

import { faker } from "@faker-js/faker";
import { useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import useResponsive from "../../hooks/useResponsive";
import { SelectConversation, UpdateSidebarType } from "../../redux/slices/app";

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
  const { current_conversation } = useSelector(
    (state) => state.conversation.direct_chat
  );

  const [searchParams, setSearchParams] = useSearchParams();

  const [conversationMenuAnchorEl, setConversationMenuAnchorEl] =
    React.useState(null);

  const openConversationMenu = Boolean(conversationMenuAnchorEl);

  const handleClickConversationMenu = (event) => {
    setConversationMenuAnchorEl(event.currentTarget);
  };

  const handleCloseConversationMenu = () => {
    setConversationMenuAnchorEl(null);
  };

  // CONTACT SIDEBAR
  const handleContactInfo = () => {
    dispatch(UpdateSidebarType("CONTACT"));
    setConversationMenuAnchorEl(null);
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: 72,
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
          height: "100%",
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
          }}
        >
          {isMobile && (
            <IconButton
              onClick={() => {
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
              src={
                current_conversation?.img ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${
                  current_conversation?.name || "user"
                }`
              }
              sx={{ width: { xs: 38, sm: 40 }, height: { xs: 38, sm: 40 } }}
            />
          </StyledBadge>

          <Stack spacing={0.2} sx={{ minWidth: 0, overflow: "hidden" }}>
            <Typography
              variant="subtitle2"
              noWrap
              sx={{ maxWidth: { xs: 120, sm: 220, md: 300 } }}
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
          spacing={isMobile ? 0.5 : 2}
          sx={{ flexShrink: 0 }}
        >
          <IconButton sx={{ p: { xs: 0.5, sm: 1 } }}>
            <VideoCamera size={20} />
          </IconButton>

          <IconButton sx={{ p: { xs: 0.5, sm: 1 } }}>
            <Phone size={20} />
          </IconButton>

          {!isMobile && (
            <IconButton sx={{ p: { xs: 0.5, sm: 1 } }}>
              <MagnifyingGlass size={20} />
            </IconButton>
          )}

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
    </Box>
  );
};

export default Header;