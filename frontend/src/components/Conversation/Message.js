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

const Message = ({ menu }) => {
  const { current_messages } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const messageEndRef = useRef(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [current_messages]);

  return (
    <Box
      sx={{
        width: "100%",
        boxSizing: "border-box",
        p: { xs: 1.5, sm: 2.5 },
      }}
    >
      <Stack spacing={1.5}>
        {current_messages && current_messages.length > 0 ? (
          current_messages.map((el, index) => {
            switch (el.type) {
              case "divider":
                return <Timeline key={el.id || index} el={el} />;

              case "msg":
              default:
                switch (el.subtype?.toLowerCase()) {
                  case "img":
                  case "media":
                    return <MediaMsg key={el.id || index} el={el} menu={menu} />;

                  case "doc":
                  case "document":
                    return <DocMsg key={el.id || index} el={el} menu={menu} />;

                  case "link":
                    return <LinkMsg key={el.id || index} el={el} menu={menu} />;

                  case "reply":
                    return <ReplyMsg key={el.id || index} el={el} menu={menu} />;

                  default:
                    return <TextMsg key={el.id || index} el={el} menu={menu} />;
                }
            }
          })
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