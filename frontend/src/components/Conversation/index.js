import React, { useEffect, useRef, useState } from "react";
import { Box, Stack, useTheme } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { getSavedWallpaper, WHATSAPP_DOODLE_SVG } from "../../utils/wallpaperHelpers";

import Header from "./Header";
import Message from "./Message";
import Footer from "./Footer";
import { socket } from "../../socket";
import {
  FetchCurrentMessages,
  SetCurrentConversation,
} from "../../redux/slices/Conversation";

const Conversation = () => {
  const dispatch = useDispatch();
  const { room_id } = useSelector((state) => state.app);
  const { conversations, current_conversation } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { user_id } = useSelector((state) => state.auth);
  const current_user_id = user_id || window.localStorage.getItem("user_id");

  const conversationsRef = useRef(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const currentConvIdRef = useRef(current_conversation?.id);
  useEffect(() => {
    currentConvIdRef.current = current_conversation?.id;
  }, [current_conversation]);

  useEffect(() => {
    if (room_id) {
      const current = (conversationsRef.current || []).find(
        (el) => el?.id?.toString() === room_id?.toString()
      );
      if (current && currentConvIdRef.current?.toString() !== room_id.toString()) {
        dispatch(SetCurrentConversation(current));
      }

      socket.emit(
        "get_messages",
        { conversation_id: room_id, user_id: current_user_id },
        (messages) => {
          dispatch(FetchCurrentMessages({ messages: messages || [] }));
        }
      );

      socket.emit("mark_messages_seen", {
        conversation_id: room_id,
        user_id: current_user_id,
      });
    }
  }, [room_id, dispatch, current_user_id]);
  const theme = useTheme();
  const [wallpaper, setWallpaper] = useState(getSavedWallpaper);

  useEffect(() => {
    const handleWallpaperChange = (e) => {
      setWallpaper(e.detail || getSavedWallpaper());
    };
    window.addEventListener("chat_wallpaper_changed", handleWallpaperChange);
    return () => {
      window.removeEventListener("chat_wallpaper_changed", handleWallpaperChange);
    };
  }, []);

  const isDarkMode = theme.palette.mode === "dark";

  const getWallpaperStyle = () => {
    const baseColor =
      wallpaper.type === "solid"
        ? wallpaper.color
        : isDarkMode
        ? "#0B141A"
        : "#EFEAE2";

    if (wallpaper.type === "image" && wallpaper.imageUrl) {
      return {
        backgroundImage: `url(${wallpaper.imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }

    if (wallpaper.overlayDoodles) {
      return {
        backgroundColor: baseColor,
        backgroundImage: `url("${WHATSAPP_DOODLE_SVG}")`,
        backgroundRepeat: "repeat",
      };
    }

    return {
      backgroundColor: baseColor,
    };
  };

  return (
    <Stack
      sx={{
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,

        display: "flex",
        flexDirection: "column",

        overflow: "hidden",
      }}
    >
      {/* ================= HEADER ================= */}
      <Box
        sx={{
          width: "100%",
          flexShrink: 0,
        }}
      >
        <Header />
      </Box>

      {/* ================= MESSAGES ================= */}
      <Box
        sx={{
          flex: 1,

          minWidth: 0,
          minHeight: 0,

          width: "100%",

          overflowY: "auto",
          overflowX: "hidden",

          scrollbarWidth: "thin",
          position: "relative",
          ...getWallpaperStyle(),
        }}
      >
        {wallpaper.dimming > 0 && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              bgcolor: `rgba(0, 0, 0, ${wallpaper.dimming / 100})`,
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
        )}
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Message menu={true} />
        </Box>
      </Box>

      {/* ================= FOOTER ================= */}
      <Box
        sx={{
          width: "100%",
          flexShrink: 0,
        }}
      >
        <Footer />
      </Box>
    </Stack>
  );
};

export default Conversation;
