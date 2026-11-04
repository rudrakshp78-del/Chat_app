import React from "react";
import { Stack, Box, useTheme, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useSelector } from "react-redux";
import useResponsive from "../../hooks/useResponsive";

import Chats from "./Chats";
import Conversation from "../../components/Conversation";
import Contact from "../../components/Contact";
import SharedMessages from "../../components/SharedMessages";
import StarredMessages from "../../components/StarredMessages";


const GeneralApp = () => {
  const theme = useTheme();
  const isDesktop = useResponsive("up", "md");

  const { sideBar, chat_type, room_id } = useSelector((store) => store.app);

  const renderSidebar = () => {
    if (!sideBar?.open) return null;

    switch (sideBar.type) {
      case "CONTACT":
        return <Contact />;

      case "SHARED":
        return <SharedMessages />;

      case "STARRED":
        return <StarredMessages />;

      default:
        return null;
    }
  };

  // Mobile layout (< 900px)
  if (!isDesktop) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          minHeight: 0,
          overflow: "hidden",
          backgroundColor:
            theme.palette.mode === "light"
              ? "#F0F4FA"
              : theme.palette.background.default,
        }}
      >
        {sideBar?.open ? (
          <Box sx={{ width: "100%", height: "100%", overflow: "hidden" }}>
            {renderSidebar()}
          </Box>
        ) : room_id !== null && chat_type === "individual" ? (
          <Box sx={{ width: "100%", height: "100%", overflow: "hidden" }}>
            <Conversation />
          </Box>
        ) : (
          <Box sx={{ width: "100%", height: "100%", overflow: "hidden" }}>
            <Chats />
          </Box>
        )}
      </Box>
    );
  }

  // Desktop layout (>= 900px)
  return (
    <Stack
      direction="row"
      sx={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        backgroundColor:
          theme.palette.mode === "light"
            ? "#F0F4FA"
            : theme.palette.background.default,
      }}
    >
      {/* LEFT - CHAT LIST */}
      <Box
        sx={{
          width: 320,
          minWidth: 320,
          height: "100%",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <Chats />
      </Box>

      {/* CENTER - CONVERSATION */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {room_id !== null && chat_type === "individual" ? (
          <Conversation />
        ) : (
          <Stack
            spacing={2.5}
            sx={{
              height: "100%",
              width: "100%",
              minHeight: 0,
              p: 3,
            }}
            alignItems="center"
            justifyContent={"center"}
          >
            <Box
              sx={{
                width: 96,
                height: 96,
                borderRadius: 4,
                bgcolor: (theme) =>
                  theme.palette.mode === "light"
                    ? alpha(theme.palette.primary.main, 0.08)
                    : alpha(theme.palette.primary.main, 0.2),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: (theme) =>
                  `0 8px 32px ${alpha(theme.palette.primary.main, 0.25)}`,
                p: 2,
              }}
            >
              <img
                src="/Trackon Opposing Finger Gun Logo.png"
                alt="Track-Chat"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </Box>

            <Stack spacing={0.5} alignItems="center">
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                  background: (theme) =>
                    theme.palette.mode === "light"
                      ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #00A884 60%, #1CCAFF 100%)`
                      : `linear-gradient(135deg, #60A5FA 0%, #34D399 60%, #38BDF8 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textAlign: "center",
                }}
              >
                Track-Chat
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: "center", maxWidth: 360 }}
              >
                End-to-end encrypted messaging, crystal-clear voice/video calls & real-time stories
              </Typography>
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              sx={{
                mt: 1,
                bgcolor: (theme) =>
                  theme.palette.mode === "light"
                    ? "rgba(0, 168, 132, 0.08)"
                    : "rgba(0, 168, 132, 0.16)",
                border: "1px solid rgba(0, 168, 132, 0.2)",
                borderRadius: 2,
                px: 2,
                py: 0.75,
                color: "#00A884",
                fontSize: "0.825rem",
                fontWeight: 600,
              }}
            >
              <span>🔒 Encrypted & Private</span>
            </Stack>
          </Stack>
        )}
      </Box>

      {/* RIGHT - SIDEBAR */}
      {sideBar?.open && (
        <Box
          sx={{
            width: 320,
            minWidth: 320,
            height: "100%",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {renderSidebar()}
        </Box>
      )}
    </Stack>
  );
};

export default GeneralApp;