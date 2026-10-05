import React, { useEffect, useRef, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useSelector } from "react-redux";

import {
  MediaMsg,
  TextMsg,
  Timeline,
  ReplyMsg,
  LinkMsg,
  DocMsg,
} from "./MsgType";
import { fMessageDayDivider } from "../../utils/formatTime";
import {
  getChatRetentionMode,
  getRetentionInfo,
} from "../../utils/chatSettingsHelpers";
import { ChatRetentionDialog } from "../PersonSettingsDialogs";

const isDifferentDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return false;
  return (
    date1.getFullYear() !== date2.getFullYear() ||
    date1.getMonth() !== date2.getMonth() ||
    date1.getDate() !== date2.getDate()
  );
};

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const Message = ({ menu, starredOnly = false }) => {
  const theme = useTheme();
  const { current_messages, search_query, current_conversation } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { room_id } = useSelector((state) => state.app);
  const activeConvId =
    room_id || current_conversation?.id || current_conversation?._id;

  const [retentionMode, setRetentionMode] = useState(() =>
    getChatRetentionMode(activeConvId)
  );
  const [openRetentionDialog, setOpenRetentionDialog] = useState(false);

  useEffect(() => {
    setRetentionMode(getChatRetentionMode(activeConvId));
  }, [activeConvId]);

  useEffect(() => {
    const handleRetentionChange = (e) => {
      if (e.detail?.conversation_id?.toString() === activeConvId?.toString()) {
        setRetentionMode(e.detail.mode);
      }
    };
    window.addEventListener("chat_retention_changed", handleRetentionChange);
    return () => {
      window.removeEventListener(
        "chat_retention_changed",
        handleRetentionChange
      );
    };
  }, [activeConvId]);

  const messageEndRef = useRef(null);

  const query = (search_query || "").trim().toLowerCase();

  let displayedMessages = current_messages || [];

  // Enforce 24-hour message retention when mode is "24_hours"
  if (retentionMode === "24_hours" && !starredOnly) {
    const now = Date.now();
    displayedMessages = displayedMessages.filter((el) => {
      if (el.starred || !el.created_at) return true;
      const msgTime = new Date(el.created_at).getTime();
      if (isNaN(msgTime)) return true;
      return now - msgTime <= TWENTY_FOUR_HOURS_MS;
    });
  }

  if (starredOnly) {
    displayedMessages = displayedMessages.filter((el) => !!el.starred);
  }

  if (query) {
    displayedMessages = displayedMessages.filter((el) => {
      if (!el?.message) return false;
      return el.message.toLowerCase().includes(query);
    });
  }

  useEffect(() => {
    if (!query && !starredOnly) {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [current_messages, query, starredOnly]);

  const retentionInfo = getRetentionInfo(retentionMode);

  return (
    <Box
      sx={{
        width: "100%",
        boxSizing: "border-box",
        p: { xs: 1.5, sm: 2.5 },
      }}
    >
      <Stack spacing={1.5}>
        {/* Retention Mode Notice Pill at top of conversation */}
        {!starredOnly && activeConvId && (
          <Box sx={{ display: "flex", justifyContent: "center", mb: 0.5 }}>
            <Box
              onClick={() => setOpenRetentionDialog(true)}
              sx={{
                px: 1.8,
                py: 0.6,
                borderRadius: 99,
                cursor: "pointer",
                bgcolor:
                  theme.palette.mode === "dark"
                    ? alpha("#1e293b", 0.88)
                    : alpha("#ffffff", 0.9),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                transition: "transform 0.15s ease",
                "&:hover": {
                  transform: "scale(1.02)",
                },
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color:
                    retentionMode === "permanent"
                      ? "text.secondary"
                      : "primary.main",
                  fontSize: 11.5,
                }}
              >
                {retentionMode === "after_viewing"
                  ? "👁️ Chats are set to delete After Viewing • Tap to change"
                  : retentionMode === "24_hours"
                  ? "🕒 Chats are set to delete 24 Hours after Viewing • Tap to change"
                  : `♾️ Chats are saved Permanently • Tap to change`}
              </Typography>
            </Box>
          </Box>
        )}

        {displayedMessages && displayedMessages.length > 0 ? (
          displayedMessages.map((el, index) => {
            let showDayDivider = false;
            if (el.type !== "divider" && el.created_at) {
              if (index === 0) {
                showDayDivider = true;
              } else {
                const prevMsg = displayedMessages[index - 1];
                if (prevMsg?.type !== "divider") {
                  showDayDivider = isDifferentDay(
                    el.created_at,
                    prevMsg?.created_at
                  );
                }
              }
            }

            const renderMsg = () => {
              switch (el.type) {
                case "divider":
                  return <Timeline key={el.id || index} el={el} />;

                case "msg":
                default:
                  switch (el.subtype?.toLowerCase()) {
                    case "img":
                    case "media":
                    case "sticker":
                      return (
                        <MediaMsg key={el.id || index} el={el} menu={menu} />
                      );

                    case "doc":
                    case "document":
                      return (
                        <DocMsg key={el.id || index} el={el} menu={menu} />
                      );

                    case "link":
                      return (
                        <LinkMsg key={el.id || index} el={el} menu={menu} />
                      );

                    case "reply":
                      return (
                        <ReplyMsg key={el.id || index} el={el} menu={menu} />
                      );

                    default:
                      return (
                        <TextMsg key={el.id || index} el={el} menu={menu} />
                      );
                  }
              }
            };

            return (
              <React.Fragment key={el.id || `msg-${index}`}>
                {showDayDivider && (
                  <Timeline
                    key={`day-${el.id || index}`}
                    el={{ text: fMessageDayDivider(el.created_at) }}
                  />
                )}
                {renderMsg()}
              </React.Fragment>
            );
          })
        ) : query ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No messages found matching "{search_query}"
            </Typography>
          </Box>
        ) : starredOnly ? (
          <Box sx={{ textAlign: "center", py: 4, px: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No starred messages yet. Tap the 3 dots on any message and select "Star message" to save it here.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No messages yet ({retentionInfo.badge} {retentionInfo.label}). Send a message to start the conversation!
            </Typography>
          </Box>
        )}
        <div ref={messageEndRef} />
      </Stack>

      <ChatRetentionDialog
        open={openRetentionDialog}
        onClose={() => setOpenRetentionDialog(false)}
        conversationId={activeConvId}
        personName={current_conversation?.name || "this chat"}
      />
    </Box>
  );
};

export default Message;