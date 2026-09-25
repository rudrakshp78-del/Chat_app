import React, { useEffect } from "react";
import { Box, Stack } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";

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
  const { conversations } = useSelector(
    (state) => state.conversation.direct_chat
  );

  useEffect(() => {
    if (room_id) {
      const current = (conversations || []).find((el) => el?.id?.toString() === room_id?.toString());
      if (current) {
        dispatch(SetCurrentConversation(current));
      }

      socket.emit(
        "get_messages",
        { conversation_id: room_id },
        (messages) => {
          console.log("Fetched messages from backend:", messages);
          dispatch(FetchCurrentMessages({ messages: messages || [] }));
        }
      );
    }
  }, [room_id, conversations, dispatch]);
  return (
    <Stack
      sx={{
        width: "100%",
        height: "100vh",
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
        }}
      >
        <Message menu={true} />
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
