import React, { useEffect, useRef } from "react";
import { Box, Stack, Typography } from "@mui/material";
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

const Message = ({ menu, starredOnly = false }) => {
  const { current_messages, search_query } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const messageEndRef = useRef(null);

  const query = (search_query || "").trim().toLowerCase();

  let displayedMessages = current_messages || [];

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

  return (
    <Box
      sx={{
        width: "100%",
        boxSizing: "border-box",
        p: { xs: 1.5, sm: 2.5 },
      }}
    >
      <Stack spacing={1.5}>
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
              No messages yet. Send a message to start the conversation!
            </Typography>
          </Box>
        )}
        <div ref={messageEndRef} />
      </Stack>
    </Box>
  );
};

export default Message;