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
          incoming,
          outgoing,
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

