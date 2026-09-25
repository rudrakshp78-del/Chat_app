import { createSlice } from "@reduxjs/toolkit";
import { faker } from "@faker-js/faker";
import { AWS_S3_REGION, S3_BUCKET_NAME } from "../../config";

const user_id = window.localStorage.getItem("user_id");

const initialState = {
  direct_chat: {
    conversations: [],
    current_conversation: null,
    current_messages: [],
  },
  group_chat: {},
};

const slice = createSlice({
  name: "conversation",
  initialState,
  reducers: {
    fetchDirectConversations(state, action) {
      const current_user_id = window.localStorage.getItem("user_id");
      const list = (action.payload.conversations || []).map((el) => {
        const this_user = el.participants.find(
          (elm) => elm._id?.toString() !== current_user_id
        );
        const lastMsg = el.messages && el.messages.length > 0 ? el.messages[el.messages.length - 1] : null;
        return {
          id: el._id,
          user_id: this_user?._id,
          name: this_user ? `${this_user.firstName || ""} ${this_user.lastName || ""}`.trim() : "Unknown",
          online: this_user?.status === "Online",
          img: this_user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${this_user?.firstName || "user"}`,
          msg: lastMsg ? lastMsg.text : "No messages yet",
          time: "9:36",
          unread: 0,
          pinned: false,
          about: this_user?.about,
        };
      });

      state.direct_chat.conversations = list;
    },
    updateDirectConversation(state, action) {
      const current_user_id = window.localStorage.getItem("user_id");
      const this_conversation = action.payload.conversation;
      if (!this_conversation) return;
      state.direct_chat.conversations = state.direct_chat.conversations.map(
        (el) => {
          if (el?.id !== this_conversation._id) {
            return el;
          } else {
            const user = this_conversation.participants?.find(
              (elm) => elm._id?.toString() !== current_user_id,
            );
            const lastMsg = this_conversation.messages && this_conversation.messages.length > 0
              ? this_conversation.messages[this_conversation.messages.length - 1]
              : null;
            return {
              id: this_conversation._id,
              user_id: user?._id,
              name: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : el.name,
              online: user?.status === "Online",
              img: user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.firstName || "user"}`,
              msg: lastMsg ? lastMsg.text : el.msg,
              time: "9:36",
              unread: 0,
              pinned: false,
            };
          }
        },
      );
    },
    addDirectConversation(state, action) {
      const current_user_id = window.localStorage.getItem("user_id");
      const this_conversation = action.payload.conversation;
      if (!this_conversation) return;

      const exists = state.direct_chat.conversations.some(
        (el) => el.id === this_conversation._id
      );

      const user = this_conversation.participants?.find(
        (elm) => elm._id?.toString() !== current_user_id,
      );

      const lastMsg = this_conversation.messages && this_conversation.messages.length > 0
        ? this_conversation.messages[this_conversation.messages.length - 1]
        : null;

      const newConv = {
        id: this_conversation._id,
        user_id: user?._id,
        name: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Unknown",
        online: user?.status === "Online",
        img: user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.firstName || "user"}`,
        msg: lastMsg ? lastMsg.text : "No messages yet",
        time: "9:36",
        unread: 0,
        pinned: false,
      };

      if (!exists) {
        state.direct_chat.conversations.push(newConv);
      } else {
        state.direct_chat.conversations = state.direct_chat.conversations.map(
          (el) => el.id === this_conversation._id ? newConv : el
        );
      }
    },
    setCurrentConversation(state, action) {
      state.direct_chat.current_conversation = action.payload;
    },
    fetchCurrentMessages(state, action) {
      const current_user_id = window.localStorage.getItem("user_id");
      const messages = action.payload.messages || [];
      const formatted_messages = messages.map((el) => {
        const toId = (el.to?._id || el.to)?.toString();
        const fromId = (el.from?._id || el.from)?.toString();
        return {
          id: el._id,
          type: "msg",
          subtype: el.type || "Text",
          message: el.text,
          incoming: toId === current_user_id,
          outgoing: fromId === current_user_id,
        };
      });
      state.direct_chat.current_messages = formatted_messages;
    },
    addDirectMessage(state, action) {
      const msg = action.payload.message;
      if (!msg) return;
      const exists = state.direct_chat.current_messages.some(
        (m) => m.id && msg.id && m.id === msg.id
      );
      if (!exists) {
        state.direct_chat.current_messages.push(msg);
      }
    },
  },
});

// Reducer
export default slice.reducer;

// ----------------------------------------------------------------------

export const FetchDirectConversations = ({ conversations }) => {
  return async (dispatch, getState) => {
    dispatch(
      slice.actions.fetchDirectConversations({
        conversations,
      }),
    );
  };
};

export const AddDirectConversation = ({ conversation }) => {
  return async (dispatch) => {
    dispatch(
      slice.actions.addDirectConversation({
        conversation,
      }),
    );
  };
};

export const UpdateDirectConversation = ({ conversation }) => {
  return async (dispatch) => {
    dispatch(
      slice.actions.updateDirectConversation({
        conversation,
      }),
    );
  };
};

export const SetCurrentConversation = (current_conversation) => {
  return async (dispatch) => {
    dispatch(slice.actions.setCurrentConversation(current_conversation));
  };
};

export const FetchCurrentMessages = ({ messages }) => {
  return async (dispatch) => {
    dispatch(
      slice.actions.fetchCurrentMessages({
        messages,
      }),
    );
  };
};

export const AddDirectMessage = (message) => {
  return async (dispatch) => {
    dispatch(
      slice.actions.addDirectMessage({
        message,
      }),
    );
  };
};
