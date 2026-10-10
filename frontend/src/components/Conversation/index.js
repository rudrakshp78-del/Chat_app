import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Stack, Typography, useTheme } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { getSavedWallpaper, WHATSAPP_DOODLE_SVG } from "../../utils/wallpaperHelpers";

import Header from "./Header";
import Message from "./Message";
import Footer from "./Footer";
import { socket } from "../../socket";
import {
  FetchCurrentMessages,
  SetCurrentConversation,
  ClearDirectMessages,
} from "../../redux/slices/Conversation";
import { showSnackbar } from "../../redux/slices/app";
import {
  getChatRetentionMode,
  areReadReceiptsEnabled,
  isPersonBlocked,
  togglePersonBlocked,
} from "../../utils/chatSettingsHelpers";

const Conversation = () => {
  const dispatch = useDispatch();
  const { room_id } = useSelector((state) => state.app);
  const { conversations, current_conversation } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { user_id } = useSelector((state) => state.auth);
  const current_user_id = user_id || window.localStorage.getItem("user_id");

  const [blocked, setBlocked] = useState(() => isPersonBlocked(room_id));

  useEffect(() => {
    setBlocked(isPersonBlocked(room_id));
  }, [room_id]);

  useEffect(() => {
    const syncBlocked = () => setBlocked(isPersonBlocked(room_id));
    window.addEventListener("friendship_updated", syncBlocked);
    window.addEventListener("privacy_settings_changed", syncBlocked);
    return () => {
      window.removeEventListener("friendship_updated", syncBlocked);
      window.removeEventListener("privacy_settings_changed", syncBlocked);
    };
  }, [room_id]);

  const conversationsRef = useRef(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const currentConvIdRef = useRef(current_conversation?.id);
  useEffect(() => {
    currentConvIdRef.current = current_conversation?.id;
  }, [current_conversation]);

  useEffect(() => {
    const activeRoomId = room_id;
    let received = false;
    const retryTimers = [];

    const clearRetries = () => {
      while (retryTimers.length > 0) {
        clearTimeout(retryTimers.pop());
      }
    };

    const requestMessages = () => {
      if (!activeRoomId || !socket.connected) return;
      socket.emit(
        "get_messages",
        { conversation_id: activeRoomId, user_id: current_user_id },
        (messages) => {
          received = true;
          clearRetries();
          dispatch(
            FetchCurrentMessages({
              messages: messages || [],
              conversation_id: activeRoomId,
            })
          );
        }
      );

      if (areReadReceiptsEnabled()) {
        socket.emit("mark_messages_seen", {
          conversation_id: activeRoomId,
          user_id: current_user_id,
        });
      }
    };

    const scheduleMessagesFetch = () => {
      received = false;
      clearRetries();
      requestMessages();
      [350, 1000].forEach((delay) => {
        const timer = setTimeout(() => {
          if (!received && socket.connected) {
            requestMessages();
          }
        }, delay);
        retryTimers.push(timer);
      });
    };

    if (activeRoomId) {
      const current = (conversationsRef.current || []).find(
        (el) => el?.id?.toString() === activeRoomId?.toString()
      );
      if (current && currentConvIdRef.current?.toString() !== activeRoomId.toString()) {
        dispatch(SetCurrentConversation(current));
      }

      scheduleMessagesFetch();
      socket.on("connect", scheduleMessagesFetch);
    }

    // When leaving the conversation, if mode is "after_viewing", delete viewed chats
    return () => {
      clearRetries();
      socket.off("connect", scheduleMessagesFetch);
      if (activeRoomId && getChatRetentionMode(activeRoomId) === "after_viewing") {
        socket.emit("clear_chat", {
          conversation_id: activeRoomId,
          user_id: current_user_id,
        });
        dispatch(ClearDirectMessages({ conversation_id: activeRoomId }));
      }
    };
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
          display: "flex",
          flexDirection: "column",

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
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            mt: "auto",
          }}
        >
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
        {blocked ? (
          <Box
            sx={{
              p: 2,
              textAlign: "center",
              bgcolor:
                theme.palette.mode === "light"
                  ? "#F8FAFF"
                  : theme.palette.background.paper,
              borderTop: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              justifyContent="center"
            >
              <Typography variant="body2" color="text.secondary">
                🚫 You blocked{" "}
                <strong>{current_conversation?.name || "this contact"}</strong>.
              </Typography>
              <Button
                size="small"
                variant="outlined"
                color="primary"
                onClick={() => {
                  togglePersonBlocked(room_id, current_conversation?.name);
                  setBlocked(false);
                  dispatch(
                    showSnackbar({
                      severity: "success",
                      message: `Unblocked ${
                        current_conversation?.name || "contact"
                      }`,
                    })
                  );
                }}
                sx={{ textTransform: "none", borderRadius: 99 }}
              >
                Tap to Unblock
              </Button>
            </Stack>
          </Box>
        ) : (
          <Footer />
        )}
      </Box>
    </Stack>
  );
};

export default Conversation;
