import React from "react";
import { useTheme } from "@mui/material/styles";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { ChatCircleDots, CircleDashed, GearSix, Phone, Users } from "phosphor-react";
import { useDispatch, useSelector } from "react-redux";
import { CloseSidebar, SelectConversation } from "../../redux/slices/app";
import ProfileMenu from "./ProfileMenu";

const NAV_ITEMS = [
  { index: 0, path: "/app", icon: <ChatCircleDots size={22} />, title: "Chats" },
  { index: 1, path: "/status", icon: <CircleDashed size={22} />, title: "Status" },
  { index: 2, path: "/group", icon: <Users size={22} />, title: "Groups" },
  { index: 3, path: "/call", icon: <Phone size={22} />, title: "Calls" },
  { index: 4, path: "/Settings", icon: <GearSix size={22} />, title: "Settings" },
];

const BottomNav = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { sideBar } = useSelector((state) => state.app);

  const currentPath = location.pathname.toLowerCase();

  const handleNavClick = (path) => {
    if (sideBar?.open) {
      dispatch(CloseSidebar());
    }
    if (path.toLowerCase() === "/app") {
      dispatch(SelectConversation({ room_id: null }));
    }
    navigate(path);
  };

  return (
    <Box
      sx={{
        zIndex: 1100,
        width: "100%",
        flexShrink: 0,
        backgroundColor: theme.palette.background.paper,
        borderTop: `1px solid ${theme.palette.divider}`,
        boxShadow: "0px -2px 8px rgba(0, 0, 0, 0.06)",
        pb: 0.75,
        pt: 0.75,
        px: 0.5,
      }}
    >
      <Stack
        sx={{ width: "100%" }}
        direction="row"
        alignItems="center"
        justifyContent="space-around"
      >
        {NAV_ITEMS.map((el) => {
          const isSelected =
            currentPath === el.path.toLowerCase() ||
            (el.path === "/app" && currentPath === "/");

          return (
            <Stack
              key={el.index}
              alignItems="center"
              justifyContent="center"
              spacing={0.25}
              onClick={() => handleNavClick(el.path)}
              sx={{
                cursor: "pointer",
                minWidth: 52,
                py: 0.25,
                userSelect: "none",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <Box
                sx={{
                  backgroundColor: isSelected
                    ? theme.palette.primary.main
                    : "transparent",
                  borderRadius: 1.5,
                  px: 1.25,
                  py: 0.35,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background-color 0.15s ease",
                }}
              >
                <IconButton
                  size="small"
                  sx={{
                    p: 0.25,
                    color: isSelected
                      ? "#ffffff"
                      : theme.palette.mode === "light"
                      ? "#080707"
                      : theme.palette.text.primary,
                  }}
                >
                  {el.icon}
                </IconButton>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.68rem",
                  fontWeight: isSelected ? 700 : 500,
                  lineHeight: 1.1,
                  color: isSelected
                    ? theme.palette.primary.main
                    : theme.palette.text.secondary,
                }}
              >
                {el.title}
              </Typography>
            </Stack>
          );
        })}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 44 }}>
          <ProfileMenu />
        </Box>
      </Stack>
    </Box>
  );
};

export default BottomNav;