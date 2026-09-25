import React from "react";
import { useTheme } from "@mui/material/styles";
import { Box, IconButton, Stack } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { ChatCircleDots, GearSix, Phone, Users } from "phosphor-react";
import ProfileMenu from "./ProfileMenu";

const NAV_ITEMS = [
  { index: 0, path: "/app", icon: <ChatCircleDots size={24} />, title: "Chats" },
  { index: 1, path: "/group", icon: <Users size={24} />, title: "Groups" },
  { index: 2, path: "/call", icon: <Phone size={24} />, title: "Calls" },
  { index: 3, path: "/Settings", icon: <GearSix size={24} />, title: "Settings" },
];

const BottomNav = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname.toLowerCase();

  return (
    <Box
      sx={{
        zIndex: 1000,
        width: "100%",
        flexShrink: 0,
        backgroundColor: theme.palette.background.paper,
        boxShadow: "0px -1px 3px rgba(0, 0, 0, 0.08)",
        pb: "max(6px, env(safe-area-inset-bottom))",
        pt: 0.75,
        px: 1,
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

          return isSelected ? (
            <Box
              key={el.index}
              sx={{
                backgroundColor: theme.palette.primary.main,
                borderRadius: 1.5,
              }}
              p={0.75}
            >
              <IconButton
                sx={{
                  width: "max-content",
                  color: "#ffffff",
                  p: 0.5,
                }}
              >
                {el.icon}
              </IconButton>
            </Box>
          ) : (
            <IconButton
              key={el.index}
              onClick={() => {
                navigate(el.path);
              }}
              sx={{
                width: "max-content",
                p: 1.25,
                color:
                  theme.palette.mode === "light"
                    ? "#080707"
                    : theme.palette.text.primary,
              }}
            >
              {el.icon}
            </IconButton>
          );
        })}
        <ProfileMenu />
      </Stack>
    </Box>
  );
};

export default BottomNav;