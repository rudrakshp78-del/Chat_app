import React from "react";
import { Stack, Box, useTheme, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import useResponsive from "../../hooks/useResponsive";

import Chats from "./Chats";
import Conversation from "../../components/Conversation";
import Contact from "../../components/Contact";
import SharedMessages from "../../components/SharedMessages";
import StarredMessages from "../../components/StarredMessages";

import NoChat from "../../assets/Illustration/NoChat";

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
            spacing={2}
            sx={{
              height: "100%",
              width: "100%",
              minHeight: 0,
            }}
            alignItems="center"
            justifyContent={"center"}
          >
            <NoChat />
            <Typography variant="subtitle2">
              Select a conversation or start new one
            </Typography>
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