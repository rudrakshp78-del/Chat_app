import { createSlice } from "@reduxjs/toolkit";
import getAvatarUrl from "../../utils/getAvatarUrl";
import { fChatListTime } from "../../utils/formatTime";

const getInitialCachedConversations = () => {
  if (typeof window === "undefined") return [];
  try {
    const uid = window.localStorage.getItem("user_id");
    if (!uid) return [];
    const raw = window.localStorage.getItem(`trackon_cached_conversations_${uid}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((c) => ({
      ...c,
      time: c.raw_time ? fChatListTime(c.raw_time) : c.time || "",
    }));
  } catch {
    return [];
  }
};

const saveCachedConversations = (conversations) => {
  if (typeof window === "undefined") return;
  try {
    const uid = window.localStorage.getItem("user_id");
    if (!uid || !Array.isArray(conversations)) return;
    window.localStorage.setItem(
      `trackon_cached_conversations_${uid}`,
      JSON.stringify(conversations)
    );
  } catch {
    // Ignore storage quota errors
  }
};

const formatMessageItem = (el, current_user_id) => {
  const fromId = (el.from?._id || el.from)?.toString();
  const outgoing = fromId === current_user_id?.toString();
  const incoming = !outgoing;
  return {
    id: el._id || el.id,
    type: "msg",
    subtype: el.type || el.subtype || "Text",
    message: el.text !== undefined ? el.text : el.message,
    file: el.file,
    fileName: el.fileName || "",
    song: el.song || null,
    reply: el.reply || "",
    starred: !!el.starred,
    reaction: el.reaction || "",
    deleted: !!el.deleted,
    status: el.status || (el.seen ? "seen" : "sent"),
    seen: Boolean(el.seen || el.status === "seen"),
    incoming,
    outgoing,
    from: fromId,
    to: (el.to?._id || el.to)?.toString(),
    created_at: el.created_at || el.createdAt || new Date().toISOString(),
  };
};

const getMessagePreview = (lastMsg, lastMsgOutgoing) => {
  if (!lastMsg) return "No messages yet";
  if (lastMsg.deleted) {
    return lastMsgOutgoing ? "You deleted this message" : "This message was deleted";
  }
  if (lastMsg.text) return lastMsg.text;
  if (lastMsg.fileName) return `📎 ${lastMsg.fileName}`;
  if (
    lastMsg.file ||
    ["Media", "Document", "Doc", "Sticker", "Img"].includes(lastMsg.type)
  ) {
    return "Attachment";
  }
  return "No messages yet";
};

const initialState = {
  direct_chat: {
    conversations: getInitialCachedConversations(),
    current_conversation: null,
    current_messages: [],
    messages_by_conversation: {},
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
      if (!state.direct_chat.messages_by_conversation) {
        state.direct_chat.messages_by_conversation = {};
      }
      const existingMap = new Map(
        (state.direct_chat.conversations || []).map((c) => [String(c.id), c])
      );

      const list = (action.payload.conversations || []).map((el) => {
        const convIdStr = String(el._id || el.id);
        const existingConv = existingMap.get(convIdStr);
        const this_user = (el.participants || []).find(
          (elm) => (elm._id || elm)?.toString() !== current_user_id?.toString()
        );
        const msgs = Array.isArray(el.messages) ? el.messages : [];
        const lastMsg =
          el.last_message || (msgs.length > 0 ? msgs[msgs.length - 1] : null);
        const lastMsgOutgoing = lastMsg
          ? (lastMsg.from?._id || lastMsg.from)?.toString() ===
            current_user_id?.toString()
          : false;
        const lastMsgStatus = lastMsg
          ? lastMsg.status || (lastMsg.seen ? "seen" : "sent")
          : null;
        const unreadCount =
          typeof el.unread_count === "number"
            ? el.unread_count
            : msgs.filter(
                (m) =>
                  (m.to?._id || m.to)?.toString() ===
                    current_user_id?.toString() &&
                  !m.seen &&
                  m.status !== "seen"
              ).length;

        const rawTime =
          lastMsg?.created_at ||
          lastMsg?.createdAt ||
          el.updatedAt ||
          el.createdAt ||
          existingConv?.raw_time ||
          null;

        // Pre-populate message cache if backend returned messages and we don't have full messages cached yet
        if (
          msgs.length > 0 &&
          (!state.direct_chat.messages_by_conversation[convIdStr] ||
            state.direct_chat.messages_by_conversation[convIdStr].length === 0)
        ) {
          state.direct_chat.messages_by_conversation[convIdStr] = msgs.map(
            (m) => formatMessageItem(m, current_user_id)
          );
        }

        return {
          id: el._id || el.id,
          user_id: (this_user?._id || this_user)?.toString(),
          name: this_user
            ? `${this_user.firstName || ""} ${this_user.lastName || ""}`.trim()
            : existingConv?.name || "Unknown",
          online: this_user?.status === "Online",
          img: getAvatarUrl(this_user?.avatar, this_user?.firstName),
          msg: getMessagePreview(lastMsg, lastMsgOutgoing),
          raw_time: rawTime,
          time: rawTime
            ? fChatListTime(rawTime)
            : existingConv?.time || "",
          unread: unreadCount,
          last_msg_outgoing: lastMsgOutgoing,
          last_msg_status: lastMsgStatus,
          pinned: false,
          about: this_user?.about,
          links: this_user?.links || [],
        };
      });

      // Sort by latest message time descending
      list.sort((a, b) => {
        const tA = a.raw_time ? new Date(a.raw_time).getTime() : 0;
        const tB = b.raw_time ? new Date(b.raw_time).getTime() : 0;
        return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
      });

      state.direct_chat.conversations = list;
      saveCachedConversations(list);
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
            const lastMsgOutgoing = lastMsg
              ? (lastMsg.from?._id || lastMsg.from)?.toString() === current_user_id?.toString()
              : el.last_msg_outgoing;
            const unreadCount = (this_conversation.messages || []).filter(
              (m) =>
                (m.to?._id || m.to)?.toString() === current_user_id?.toString() &&
                !m.seen &&
                m.status !== "seen"
            ).length;
            const rawTime =
              lastMsg?.created_at ||
              lastMsg?.createdAt ||
              el.raw_time ||
              new Date().toISOString();
            const updated = {
              id: this_conversation._id,
              user_id: (user?._id || user)?.toString() || el.user_id,
              name: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : el.name,
              online: user?.status === "Online",
              img: getAvatarUrl(user?.avatar, user?.firstName),
              msg: lastMsg ? getMessagePreview(lastMsg, lastMsgOutgoing) : el.msg,
              raw_time: rawTime,
              time: rawTime ? fChatListTime(rawTime) : (el.time || fChatListTime(new Date())),
              unread: unreadCount,
              last_msg_outgoing: lastMsgOutgoing,
              last_msg_status: lastMsg ? (lastMsg.status || (lastMsg.seen ? "seen" : "sent")) : el.last_msg_status,
              pinned: false,
              about: user?.about || el.about,
              links: user?.links || el.links || [],
            };
            matchedUpdated = updated;
            return updated;
          }
        },
      );
      saveCachedConversations(state.direct_chat.conversations);
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
      const lastMsgOutgoing = lastMsg
        ? (lastMsg.from?._id || lastMsg.from)?.toString() === current_user_id?.toString()
        : false;

      const unreadCount = (this_conversation.messages || []).filter(
        (m) =>
          (m.to?._id || m.to)?.toString() === current_user_id?.toString() &&
          !m.seen &&
          m.status !== "seen"
      ).length;

      const rawTime =
        lastMsg?.created_at ||
        lastMsg?.createdAt ||
        new Date().toISOString();

      const newConv = {
        id: this_conversation._id,
        user_id: (user?._id || user)?.toString(),
        name: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Unknown",
        online: user?.status === "Online",
        img: getAvatarUrl(user?.avatar, user?.firstName),
        msg: getMessagePreview(lastMsg, lastMsgOutgoing),
        raw_time: rawTime,
        time: fChatListTime(rawTime),
        unread: unreadCount,
        last_msg_outgoing: lastMsgOutgoing,
        last_msg_status: lastMsg ? (lastMsg.status || (lastMsg.seen ? "seen" : "sent")) : null,
        pinned: false,
        about: user?.about,
        links: user?.links || [],
      };

      if (!exists) {
        state.direct_chat.conversations.unshift(newConv);
      } else {
        state.direct_chat.conversations = state.direct_chat.conversations.map(
          (el) => el.id?.toString() === this_conversation._id?.toString() ? newConv : el
        );
      }
      saveCachedConversations(state.direct_chat.conversations);
      state.direct_chat.current_conversation = newConv;
    },
    setCurrentConversation(state, action) {
      state.direct_chat.current_conversation = action.payload;
      const convId = (action.payload?.id || action.payload?._id)?.toString();
      if (convId) {
        if (state.direct_chat.conversations) {
          const target = state.direct_chat.conversations.find(
            (c) => c.id?.toString() === convId || c._id?.toString() === convId
          );
          if (target && target.unread > 0) {
            target.unread = 0;
            saveCachedConversations(state.direct_chat.conversations);
          }
        }
        // Immediately populate messages from per-conversation cache if available
        const cachedMsgs = state.direct_chat.messages_by_conversation?.[convId];
        if (Array.isArray(cachedMsgs)) {
          state.direct_chat.current_messages = cachedMsgs;
        } else {
          state.direct_chat.current_messages = [];
        }
      }
    },
    fetchCurrentMessages(state, action) {
      const current_user_id = window.localStorage.getItem("user_id");
      const messages = action.payload.messages || [];
      const convId = (
        action.payload.conversation_id ||
        state.direct_chat.current_conversation?.id ||
        state.direct_chat.current_conversation?._id
      )?.toString();
      const formatted_messages = messages.map((el) =>
        formatMessageItem(el, current_user_id)
      );
      state.direct_chat.current_messages = formatted_messages;
      if (convId) {
        if (!state.direct_chat.messages_by_conversation) {
          state.direct_chat.messages_by_conversation = {};
        }
        state.direct_chat.messages_by_conversation[convId] = formatted_messages;
      }
    },
    addDirectMessage(state, action) {
      const msg = action.payload.message;
      if (!msg) return;
      const formattedMsg = {
        ...msg,
        status: msg.status || (msg.seen ? "seen" : "sent"),
        seen: Boolean(msg.seen || msg.status === "seen"),
        created_at: msg.created_at || msg.createdAt || new Date().toISOString(),
      };
      const exists = state.direct_chat.current_messages.some(
        (m) => m.id && formattedMsg.id && m.id === formattedMsg.id
      );
      if (!exists) {
        state.direct_chat.current_messages.push(formattedMsg);
      }
      const convId = (
        state.direct_chat.current_conversation?.id ||
        state.direct_chat.current_conversation?._id
      )?.toString();
      if (convId) {
        if (!state.direct_chat.messages_by_conversation) {
          state.direct_chat.messages_by_conversation = {};
        }
        state.direct_chat.messages_by_conversation[convId] =
          state.direct_chat.current_messages;
      }
    },
    markMessagesSeen(state, action) {
      const { conversation_id } = action.payload || {};
      state.direct_chat.current_messages.forEach((m) => {
        if (m.outgoing && (m.status !== "seen" || !m.seen)) {
          m.status = "seen";
          m.seen = true;
        }
      });

      if (conversation_id && state.direct_chat.conversations) {
        const target = state.direct_chat.conversations.find(
          (c) =>
            c.id?.toString() === conversation_id?.toString() ||
            c._id?.toString() === conversation_id?.toString()
        );
        if (target) {
          if (target.unread > 0) target.unread = 0;
          if (target.last_msg_status !== "seen") target.last_msg_status = "seen";
        }
      }
    },
    markMessagesDelivered(state, action) {
      const { conversation_id } = action.payload || {};
      state.direct_chat.current_messages.forEach((m) => {
        if (m.outgoing && m.status === "sent") {
          m.status = "delivered";
        }
      });

      if (conversation_id && state.direct_chat.conversations) {
        const target = state.direct_chat.conversations.find(
          (c) =>
            c.id?.toString() === conversation_id?.toString() ||
            c._id?.toString() === conversation_id?.toString()
        );
        if (target && target.last_msg_status === "sent") {
          target.last_msg_status = "delivered";
        }
      }
    },
    updateConversationOnNewMessage(state, action) {
      const { conversation_id, message, is_current } = action.payload;
      if (!conversation_id || !message) return;

      const current_user_id = window.localStorage.getItem("user_id");
      const isOutgoing = (message.from?._id || message.from)?.toString() === current_user_id?.toString();
      const previewText = getMessagePreview(message, isOutgoing);
      const msgTime = message.created_at || message.createdAt || new Date().toISOString();

      state.direct_chat.conversations = state.direct_chat.conversations.map((c) => {
        if (
          c.id?.toString() === conversation_id?.toString() ||
          c._id?.toString() === conversation_id?.toString()
        ) {
          return {
            ...c,
            msg: previewText,
            raw_time: msgTime,
            time: fChatListTime(msgTime),
            unread: is_current ? 0 : (c.unread || 0) + 1,
            last_msg_outgoing: isOutgoing,
            last_msg_status: message.status || (message.seen ? "seen" : "sent"),
          };
        }
        return c;
      });
      saveCachedConversations(state.direct_chat.conversations);

      if (
        state.direct_chat.current_conversation &&
        (state.direct_chat.current_conversation.id?.toString() === conversation_id?.toString() ||
          state.direct_chat.current_conversation._id?.toString() === conversation_id?.toString())
      ) {
        state.direct_chat.current_conversation = {
          ...state.direct_chat.current_conversation,
          msg: previewText,
          raw_time: msgTime,
          time: fChatListTime(msgTime),
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
        if (!state.direct_chat.messages_by_conversation) {
          state.direct_chat.messages_by_conversation = {};
        }
        state.direct_chat.messages_by_conversation[String(convId)] =
          state.direct_chat.current_messages;

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
        saveCachedConversations(state.direct_chat.conversations);
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
      saveCachedConversations(state.direct_chat.conversations);
      if (state.direct_chat.messages_by_conversation) {
        delete state.direct_chat.messages_by_conversation[String(conversation_id)];
      }
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
        if (state.direct_chat.messages_by_conversation) {
          state.direct_chat.messages_by_conversation[String(conversation_id)] = [];
        }
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
        saveCachedConversations(state.direct_chat.conversations);
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
  extraReducers: (builder) => {
    builder.addCase("persist/REHYDRATE", (state) => {
      if (state.direct_chat) {
        const cached = getInitialCachedConversations();
        if (
          (!state.direct_chat.conversations ||
            state.direct_chat.conversations.length === 0) &&
          cached.length > 0
        ) {
          state.direct_chat.conversations = cached;
        } else if (Array.isArray(state.direct_chat.conversations)) {
          state.direct_chat.conversations = state.direct_chat.conversations.map(
            (c) => ({
              ...c,
              time: c.raw_time ? fChatListTime(c.raw_time) : c.time || "",
            })
          );
        }
        if (!state.direct_chat.messages_by_conversation) {
          state.direct_chat.messages_by_conversation = {};
        }
        state.direct_chat.current_conversation = null;
        state.direct_chat.current_messages = [];
        state.direct_chat.open_search = false;
        state.direct_chat.search_query = "";
        state.direct_chat.replying_to = null;
      }
    });
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

export const FetchCurrentMessages = ({ messages, conversation_id }) => {
  return async (dispatch) => {
    dispatch(
      slice.actions.fetchCurrentMessages({
        messages,
        conversation_id,
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

export const MarkMessagesSeen = (payload) => {
  return async (dispatch) => {
    dispatch(slice.actions.markMessagesSeen(payload));
  };
};

export const MarkMessagesDelivered = (payload) => {
  return async (dispatch) => {
    dispatch(slice.actions.markMessagesDelivered(payload));
  };
};


