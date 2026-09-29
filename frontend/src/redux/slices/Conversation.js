import { createSlice } from "@reduxjs/toolkit";
import { faker } from "@faker-js/faker";
import getAvatarUrl from "../../utils/getAvatarUrl";

const user_id = window.localStorage.getItem("user_id");

const initialState = {
  direct_chat: {
    conversations: [],
    current_conversation: null,
    current_messages: [],
    search_query: "",
    open_search: false,
    replying_to: null,
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
          (elm) => (elm._id || elm)?.toString() !== current_user_id?.toString()
        );
        const lastMsg = el.messages && el.messages.length > 0 ? el.messages[el.messages.length - 1] : null;
        return {
          id: el._id,
          user_id: (this_user?._id || this_user)?.toString(),
          name: this_user ? `${this_user.firstName || ""} ${this_user.lastName || ""}`.trim() : "Unknown",
          online: this_user?.status === "Online",
          img: getAvatarUrl(this_user?.avatar, this_user?.firstName),
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
      let matchedUpdated = null;
      state.direct_chat.conversations = state.direct_chat.conversations.map(
        (el) => {
          if (el?.id?.toString() !== this_conversation._id?.toString()) {
            return el;
          } else {
            const user = this_conversation.participants?.find(
              (elm) => (elm._id || elm)?.toString() !== current_user_id?.toString(),
            );
            const lastMsg = this_conversation.messages && this_conversation.messages.length > 0
              ? this_conversation.messages[this_conversation.messages.length - 1]
              : null;
            const updated = {
              id: this_conversation._id,
              user_id: (user?._id || user)?.toString() || el.user_id,
              name: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : el.name,
              online: user?.status === "Online",
              img: getAvatarUrl(user?.avatar, user?.firstName),
              msg: lastMsg ? lastMsg.text : el.msg,
              time: "9:36",
              unread: 0,
              pinned: false,
            };
            matchedUpdated = updated;
            return updated;
          }
        },
      );
      if (
        matchedUpdated &&
        state.direct_chat.current_conversation?.id?.toString() === this_conversation._id?.toString()
      ) {
        state.direct_chat.current_conversation = matchedUpdated;
      }
    },
    addDirectConversation(state, action) {
      const current_user_id = window.localStorage.getItem("user_id");
      const this_conversation = action.payload.conversation;
      if (!this_conversation) return;

      const exists = state.direct_chat.conversations.some(
        (el) => el.id?.toString() === this_conversation._id?.toString()
      );

      const user = this_conversation.participants?.find(
        (elm) => (elm._id || elm)?.toString() !== current_user_id?.toString(),
      );

      const lastMsg = this_conversation.messages && this_conversation.messages.length > 0
        ? this_conversation.messages[this_conversation.messages.length - 1]
        : null;

      const newConv = {
        id: this_conversation._id,
        user_id: (user?._id || user)?.toString(),
        name: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Unknown",
        online: user?.status === "Online",
        img: getAvatarUrl(user?.avatar, user?.firstName),
        msg: lastMsg ? lastMsg.text : "No messages yet",
        time: "9:36",
        unread: 0,
        pinned: false,
      };

      if (!exists) {
        state.direct_chat.conversations.push(newConv);
      } else {
        state.direct_chat.conversations = state.direct_chat.conversations.map(
          (el) => el.id?.toString() === this_conversation._id?.toString() ? newConv : el
        );
      }
      state.direct_chat.current_conversation = newConv;
    },
    setCurrentConversation(state, action) {
      state.direct_chat.current_conversation = action.payload;
    },
    fetchCurrentMessages(state, action) {
      const current_user_id = window.localStorage.getItem("user_id");
      const messages = action.payload.messages || [];
      const formatted_messages = messages.map((el) => {
        const fromId = (el.from?._id || el.from)?.toString();
        const outgoing = fromId === current_user_id?.toString();
        const incoming = !outgoing;
        return {
          id: el._id,
          type: "msg",
          subtype: el.type || "Text",
          message: el.text,
          file: el.file,
          reply: el.reply || "",
          starred: !!el.starred,
          reaction: el.reaction || "",
          deleted: !!el.deleted,
          incoming,
          outgoing,
          from: fromId,
          to: (el.to?._id || el.to)?.toString(),
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
    updateConversationOnNewMessage(state, action) {
      const { conversation_id, message, is_current } = action.payload;
      if (!conversation_id || !message) return;

      const previewText = message.text || (message.file ? "Attachment" : "New message");

      state.direct_chat.conversations = state.direct_chat.conversations.map((c) => {
        if (
          c.id?.toString() === conversation_id?.toString() ||
          c._id?.toString() === conversation_id?.toString()
        ) {
          return {
            ...c,
            msg: previewText,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            unread: is_current ? 0 : (c.unread || 0) + 1,
          };
        }
        return c;
      });

      if (
        state.direct_chat.current_conversation &&
        (state.direct_chat.current_conversation.id?.toString() === conversation_id?.toString() ||
          state.direct_chat.current_conversation._id?.toString() === conversation_id?.toString())
      ) {
        state.direct_chat.current_conversation = {
          ...state.direct_chat.current_conversation,
          msg: previewText,
        };
      }
    },
    setReplyingTo(state, action) {
      state.direct_chat.replying_to = action.payload;
    },
    clearReplyingTo(state) {
      state.direct_chat.replying_to = null;
    },
    deleteDirectMessage(state, action) {
      const { message_id, conversation_id, delete_for } = action.payload;

      if (delete_for === "everyone") {
        // WhatsApp style: mark message as deleted so bubble displays "This message was deleted"
        state.direct_chat.current_messages = state.direct_chat.current_messages.map((m) => {
          if (m.id?.toString() === message_id?.toString()) {
            return {
              ...m,
              deleted: true,
              message: "",
              file: "",
              reply: "",
              reaction: "",
            };
          }
          return m;
        });
      } else {
        // Delete for me: remove message completely from current user's view
        state.direct_chat.current_messages = state.direct_chat.current_messages.filter(
          (m) => m.id?.toString() !== message_id?.toString()
        );
      }

      const convId = conversation_id || state.direct_chat.current_conversation?.id;
      if (convId) {
        const remainingMsgs = state.direct_chat.current_messages;
        const lastMsg = remainingMsgs.length > 0 ? remainingMsgs[remainingMsgs.length - 1] : null;
        let preview = "No messages yet";
        if (lastMsg) {
          if (lastMsg.deleted) {
            preview = lastMsg.outgoing ? "You deleted this message" : "This message was deleted";
          } else {
            preview = lastMsg.message || (lastMsg.file ? "Attachment" : "No messages yet");
          }
        }

        state.direct_chat.conversations = state.direct_chat.conversations.map((c) => {
          if (c.id?.toString() === convId?.toString()) {
            return {
              ...c,
              msg: preview,
            };
          }
          return c;
        });
        if (state.direct_chat.current_conversation?.id?.toString() === convId?.toString()) {
          state.direct_chat.current_conversation = {
            ...state.direct_chat.current_conversation,
            msg: preview,
          };
        }
      }
    },
    reactDirectMessage(state, action) {
      const { message_id, reaction } = action.payload;
      state.direct_chat.current_messages = state.direct_chat.current_messages.map((m) => {
        if (m.id?.toString() === message_id?.toString()) {
          return { ...m, reaction };
        }
        return m;
      });
    },
    deleteDirectConversation(state, action) {
      const conversation_id = action.payload?.conversation_id;
      if (!conversation_id) {
        state.direct_chat.current_conversation = null;
        state.direct_chat.current_messages = [];
        return;
      }
      state.direct_chat.conversations = state.direct_chat.conversations.filter(
        (c) =>
          c.id?.toString() !== conversation_id?.toString() &&
          c._id?.toString() !== conversation_id?.toString()
      );
      if (
        state.direct_chat.current_conversation?.id?.toString() === conversation_id?.toString() ||
        state.direct_chat.current_conversation?._id?.toString() === conversation_id?.toString()
      ) {
        state.direct_chat.current_conversation = null;
        state.direct_chat.current_messages = [];
      }
    },
    clearDirectMessages(state, action) {
      const conversation_id = action.payload?.conversation_id;
      if (
        !conversation_id ||
        state.direct_chat.current_conversation?.id?.toString() === conversation_id?.toString() ||
        state.direct_chat.current_conversation?._id?.toString() === conversation_id?.toString()
      ) {
        state.direct_chat.current_messages = [];
      }
      if (conversation_id) {
        state.direct_chat.conversations = state.direct_chat.conversations.map((c) => {
          if (
            c.id?.toString() === conversation_id?.toString() ||
            c._id?.toString() === conversation_id?.toString()
          ) {
            return {
              ...c,
              msg: "No messages yet",
            };
          }
          return c;
        });
        if (
          state.direct_chat.current_conversation &&
          (state.direct_chat.current_conversation?.id?.toString() === conversation_id?.toString() ||
            state.direct_chat.current_conversation?._id?.toString() === conversation_id?.toString())
        ) {
          state.direct_chat.current_conversation = {
            ...state.direct_chat.current_conversation,
            msg: "No messages yet",
          };
        }
      }
    },
    starDirectMessage(state, action) {
      const { message_id, starred } = action.payload;
      state.direct_chat.current_messages = state.direct_chat.current_messages.map((m) => {
        if (m.id?.toString() === message_id?.toString()) {
          return { ...m, starred };
        }
        return m;
      });
    },
    setSearchQuery(state, action) {
      state.direct_chat.search_query = action.payload.query;
    },
    toggleSearch(state) {
      state.direct_chat.open_search = !state.direct_chat.open_search;
      if (!state.direct_chat.open_search) {
        state.direct_chat.search_query = "";
      }
    },
    closeSearch(state) {
      state.direct_chat.open_search = false;
      state.direct_chat.search_query = "";
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

export const SetSearchQuery = (query) => {
  return async (dispatch) => {
    dispatch(slice.actions.setSearchQuery({ query }));
  };
};

export const ToggleSearch = () => {
  return async (dispatch) => {
    dispatch(slice.actions.toggleSearch());
  };
};

export const CloseSearch = () => {
  return async (dispatch) => {
    dispatch(slice.actions.closeSearch());
  };
};

export const SetReplyingTo = (message) => {
  return async (dispatch) => {
    dispatch(slice.actions.setReplyingTo(message));
  };
};

export const ClearReplyingTo = () => {
  return async (dispatch) => {
    dispatch(slice.actions.clearReplyingTo());
  };
};

export const DeleteDirectMessage = (payload) => {
  return async (dispatch) => {
    dispatch(slice.actions.deleteDirectMessage(payload));
  };
};

export const ReactDirectMessage = (payload) => {
  return async (dispatch) => {
    dispatch(slice.actions.reactDirectMessage(payload));
  };
};

export const StarDirectMessage = (payload) => {
  return async (dispatch) => {
    dispatch(slice.actions.starDirectMessage(payload));
  };
};

export const DeleteDirectConversation = (payload) => {
  return async (dispatch) => {
    dispatch(slice.actions.deleteDirectConversation(payload));
  };
};

export const ClearDirectMessages = (payload) => {
  return async (dispatch) => {
    dispatch(slice.actions.clearDirectMessages(payload));
  };
};

export const UpdateConversationOnNewMessage = (payload) => {
  return async (dispatch) => {
    dispatch(slice.actions.updateConversationOnNewMessage(payload));
  };
};


