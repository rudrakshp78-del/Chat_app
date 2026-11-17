import React, { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import useResponsive from "../../hooks/useResponsive";
import SideBar from "./sidebar";
import BottomNav from "./BottomNav";
import InAppNotification from "../../components/InAppNotification";
import FirstTimeNotificationDialog from "../../components/FirstTimeNotificationDialog";
import PullToRefresh from "../../components/PullToRefresh";
import {
  playNotificationChime,
  showOutsideNotification,
  updateAppBadge,
  clearConversationNotification,
  requestNotificationPermission,
  unlockAudio,
} from "../../utils/notification";
import { initPushNotifications } from "../../utils/pushNotification";

import {
  CloseSidebar,
  FetchFriendRequests,
  FetchFriends,
  FetchUserProfile,
  FetchUsers,
  SelectConversation,
  UpdateSidebarType,
  showSnackbar,
} from "../../redux/slices/app";

import { socket, connectSocket } from "../../socket";
import axios from "../../utils/axios";
import { BASE_URL } from "../../config";
import { updateToken } from "../../redux/slices/auth";

import {
  FetchDirectConversations,
  FetchDirectConversationsFromServer,
  UpdateDirectConversation,
  AddDirectConversation,
  AddDirectMessage,
  UpdateConversationOnNewMessage,
  DeleteDirectMessage,
  ReactDirectMessage,
  StarDirectMessage,
  DeleteDirectConversation,
  ClearDirectMessages,
  MarkMessagesSeen,
  MarkMessagesDelivered,
} from "../../redux/slices/Conversation";

import {
  CloseAudioNotificationDialog,
  PushToAudioCallQueue,
  UpdateAudioCallDialog,
  ResetAudioCallQueue,
} from "../../redux/slices/audioCall";

import {
  CloseVideoNotificationDialog,
  PushToVideoCallQueue,
  UpdateVideoCallDialog,
  ResetVideoCallQueue,
} from "../../redux/slices/videoCall";

import AudioCallNotification from "../../sections/dashboard/Audio/CallNotification";
import VideoCallNotification from "../../sections/dashboard/video/CallNotification";

import AudioCallDialog from "../../sections/dashboard/Audio/CallDialog";
import VideoCallDialog from "../../sections/dashboard/video/CallDialog";
import { FetchAllStatuses } from "../../redux/slices/status";

import { isConversationMuted } from "../../utils/muteHelpers";

const DashboardLayout = () => {
  const theme = useTheme();
  const [inAppNotification, setInAppNotification] = React.useState(null);
  const isDesktop = useResponsive("up", "md");
  const location = useLocation();
  const navigate = useNavigate();

  const dispatch = useDispatch();

  const { user_id, isLoggedIn } = useSelector((state) => state.auth);

  const { conversations } = useSelector(
    (state) => state.conversation.direct_chat,
  );

  const { open_audio_notification_dialog, open_audio_dialog } = useSelector(
    (state) => state.audioCall,
  );

  const { open_video_notification_dialog, open_video_dialog } = useSelector(
    (state) => state.videoCall,
  );

  const { current_conversation } = useSelector(
    (state) => state.conversation.direct_chat,
  );

  const { room_id, sideBar } = useSelector((state) => state.app);

  const room_id_ref = useRef(room_id);
  useEffect(() => {
    room_id_ref.current = room_id;
    if (room_id) {
      clearConversationNotification(room_id);
    }
  }, [room_id]);

  const sideBar_ref = useRef(sideBar);
  useEffect(() => {
    sideBar_ref.current = sideBar;
  }, [sideBar]);

  const pathname_ref = useRef(location.pathname);
  useEffect(() => {
    pathname_ref.current = location.pathname;
  }, [location.pathname]);

  // Handle Android hardware / gesture back button inside mobile chat, contact sidebar, modal dialogs, or sub-pages
  useEffect(() => {
    window.__handleAndroidBack = () => {
      // 1. Any registered custom back handler (e.g., status stories viewer, photo editor)
      if (Array.isArray(window.__backHandlers) && window.__backHandlers.length > 0) {
        for (let i = window.__backHandlers.length - 1; i >= 0; i--) {
          const handler = window.__backHandlers[i];
          if (typeof handler === "function") {
            try {
              const handled = handler();
              if (handled !== false) {
                return "HANDLED";
              }
            } catch (e) {
              console.error("Back handler error:", e);
            }
          }
        }
      }

      // 2. Any open MUI Dialog / Modal / Menu / Popover -> close with Escape
      const activeModal = document.querySelector(
        '.MuiDialog-root:not([aria-hidden="true"]), .MuiModal-root:not([aria-hidden="true"]), .MuiMenu-root, .MuiPopover-root'
      );
      if (activeModal) {
        const escapeEvent = new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          keyCode: 27,
          which: 27,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(escapeEvent);
        return "HANDLED";
      }

      // 3. Contact Sidebar: if in Shared/Starred, step back to Contact; else close sidebar
      if (sideBar_ref.current?.open) {
        if (sideBar_ref.current?.type === "SHARED" || sideBar_ref.current?.type === "STARRED") {
          dispatch(UpdateSidebarType("CONTACT"));
        } else {
          dispatch(CloseSidebar());
        }
        return "HANDLED";
      }

      // 4. Active Chat Conversation -> step back to chats list
      if (room_id_ref.current !== null) {
        dispatch(SelectConversation({ room_id: null }));
        return "HANDLED";
      }

      // 5. Current route navigation: Go back in history instead of blindly dumping user on /app
      const currentPath = (pathname_ref.current || "").toLowerCase();
      const isHome = currentPath === "/app" || currentPath === "/" || currentPath === "/index.html";
      if (!isHome) {
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate("/app");
        }
        return "HANDLED";
      }

      // 6. At root home chats list with no subviews open -> allow graceful exit
      return "EXIT";
    };

    return () => {
      delete window.__handleAndroidBack;
    };
  }, [dispatch, navigate]);

  // Handle tapping a native notification from the Android notification bar
  useEffect(() => {
    const handleOpenNotificationChat = (e) => {
      const cid = e.detail?.conversation_id;
      if (cid) {
        dispatch(SelectConversation({ room_id: cid }));
        navigate("/app");
      }
    };
    window.addEventListener("open_notification_chat", handleOpenNotificationChat);

    // Check if cold-started by tapping a message notification from tray / lock screen
    if (typeof window !== "undefined" && window.AndroidNotificationBridge?.getPendingConversationId) {
      try {
        const pendingCid = window.AndroidNotificationBridge.getPendingConversationId();
        if (pendingCid) {
          window.AndroidNotificationBridge.clearPendingConversationId();
          handleOpenNotificationChat({ detail: { conversation_id: pendingCid } });
        }
      } catch (err) {
        console.warn("Pending conversation check warning:", err);
      }
    }

    return () => {
      window.removeEventListener("open_notification_chat", handleOpenNotificationChat);
    };
  }, [dispatch, navigate]);

  useEffect(() => {
    if (isDesktop) return undefined;

    const handlePopState = () => {
      if (sideBar_ref.current?.open) {
        if (sideBar_ref.current?.type === "SHARED" || sideBar_ref.current?.type === "STARRED") {
          dispatch(UpdateSidebarType("CONTACT"));
        } else {
          dispatch(CloseSidebar());
        }
      } else if (room_id_ref.current !== null) {
        dispatch(SelectConversation({ room_id: null }));
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isDesktop, dispatch]);

  const current_conversation_ref = useRef(current_conversation);
  useEffect(() => {
    current_conversation_ref.current = current_conversation;
    if (typeof window !== "undefined" && window.AndroidNotificationBridge?.setActiveConversation) {
      window.AndroidNotificationBridge.setActiveConversation(
        current_conversation?.id?.toString() || ""
      );
    }
  }, [current_conversation]);

  useEffect(() => {
    if (user_id && typeof window !== "undefined" && window.AndroidNotificationBridge?.setLoggedInUser) {
      const authToken =
        window.localStorage.getItem("token") ||
        window.localStorage.getItem("accessToken") ||
        "";
      window.AndroidNotificationBridge.setLoggedInUser(user_id, authToken);
    }
  }, [user_id]);

  // Proactively validate and refresh token on app mount / dashboard view
  useEffect(() => {
    const currentToken =
      typeof window !== "undefined"
        ? window.localStorage.getItem("token") || window.localStorage.getItem("accessToken")
        : null;

    if (currentToken) {
      axios
        .post("/auth/refresh-token", { token: currentToken })
        .then((res) => {
          if (res.data?.token) {
            const freshToken = res.data.token;
            dispatch(updateToken({ token: freshToken }));
            if (typeof window !== "undefined") {
              window.localStorage.setItem("token", freshToken);
              window.localStorage.setItem("accessToken", freshToken);
              if (user_id && window.AndroidNotificationBridge?.setLoggedInUser) {
                window.AndroidNotificationBridge.setLoggedInUser(user_id, freshToken);
              }
            }
          }
        })
        .catch((err) => {
          console.warn("Silent token refresh on mount:", err?.message || err);
        });
    }
  }, [dispatch, user_id]);

  const conversations_ref = useRef(conversations);
  const notifiedMessageIdsRef = useRef(new Set());
  useEffect(() => {
    conversations_ref.current = conversations;
    const totalUnread = (conversations || []).reduce(
      (sum, c) => sum + (Number(c.unread) || 0),
      0
    );
    updateAppBadge(totalUnread);
  }, [conversations]);

  // Request notification permissions (Native Android 13+ and Web) and unlock audio pipeline
  useEffect(() => {
    requestNotificationPermission();
    unlockAudio();
  }, []);

  // Only reset active conversation if switching accounts (user_id changed)
  const previousUserIdRef = useRef(user_id);
  useEffect(() => {
    if (previousUserIdRef.current && user_id && previousUserIdRef.current !== user_id) {
      dispatch(SelectConversation({ room_id: null }));
    }
    previousUserIdRef.current = user_id;
  }, [dispatch, user_id]);

  // Fetch user profile & pending friend requests
  useEffect(() => {
    if (isLoggedIn) {
      dispatch(FetchUserProfile());
      dispatch(FetchFriendRequests());
    }
  }, [dispatch, isLoggedIn]);

  // Dialog close handlers
  const handleCloseAudioDialog = () => {
    dispatch(UpdateAudioCallDialog({ state: false }));
  };

  const handleCloseAudioNotificationDialog = () => {
    dispatch(CloseAudioNotificationDialog());
  };

  const handleCloseVideoDialog = () => {
    dispatch(UpdateVideoCallDialog({ state: false }));
  };

  const handleCloseVideoNotificationDialog = () => {
    dispatch(CloseVideoNotificationDialog());
  };

  // Socket events
  useEffect(() => {
    if (!isLoggedIn || !user_id) {
      return;
    }

    const handleDirectConversations = (data) => {
      if (Array.isArray(data)) {
        dispatch(FetchDirectConversations({ conversations: data }));

        // Check if any conversation in MongoDB has an unread message that was not notified yet (Home screen & Lock screen backup)
        if (typeof document !== "undefined" && document.hidden) {
          data.forEach((conv) => {
            const unreadCount = Number(conv.unread_count) || Number(conv.unread) || 0;
            if (unreadCount > 0 && conv.last_message) {
              const msgId = (conv.last_message._id || conv.last_message.id || "").toString();
              const isOutgoing = (conv.last_message.from?._id || conv.last_message.from)?.toString() === user_id?.toString();
              if (msgId && !isOutgoing && !notifiedMessageIdsRef.current.has(msgId)) {
                notifiedMessageIdsRef.current.add(msgId);
                const senderName = conv.name || "Trackon";
                const contentPreview = conv.last_message.text || "New message received";
                showOutsideNotification({
                  title: senderName,
                  body: contentPreview,
                  icon: conv.img || "",
                  conversation_id: conv._id || conv.id,
                  unreadCount: Math.max(1, unreadCount),
                  totalBadgeCount: Math.max(1, unreadCount),
                  playSound: true,
                });
              }
            }
          });
        }
      }
    };

    // Periodic MongoDB sync every 12 seconds when app is in background or phone is locked
    const bgMongoSyncInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden && socket && socket.connected && user_id) {
        socket.emit("get_direct_conversations", { user_id });
      }
    }, 12000);

    // Initialize push notifications on native mobile devices
    initPushNotifications(user_id);

    window.__openConversation = (convId) => {
      if (convId) {
        dispatch(SelectConversation({ room_id: convId }));
        navigate("/app");
      }
    };

    const handleSocketConnect = () => {
      socket.emit("user_connected", { user_id });
      const savedToken = window.localStorage.getItem("fcm_token");
      if (savedToken) {
        socket.emit("save_fcm_token", { user_id, fcm_token: savedToken });
      }
    };

    if (!socket.connected) {
      connectSocket(user_id);
    } else {
      handleSocketConnect();
    }

    socket.on("connect", handleSocketConnect);
    socket.on("direct_conversations", handleDirectConversations);

    // New message
    socket.on("new_message", (data) => {
      const message = data?.message;
      if (!message) return;

      console.log("NEW MESSAGE:", data);

      const current_user_id = user_id || window.localStorage.getItem("user_id");
      const fromId = (message.from?._id || message.from)?.toString();
      const outgoing = fromId === current_user_id?.toString();
      const incoming = !outgoing;

      const msgUniqueId = (message._id || message.id || message.temp_id)?.toString();
      if (msgUniqueId) {
        notifiedMessageIdsRef.current.add(msgUniqueId);
      }

      const isCurrentChat =
        current_conversation_ref.current?.id?.toString() === data.conversation_id?.toString() ||
        room_id_ref.current?.toString() === data.conversation_id?.toString();

      // Only treat chat as actively viewed if the window is currently visible (not minimized/on home screen)
      const isChatVisibleToUser =
        typeof document !== "undefined" &&
        !document.hidden &&
        isCurrentChat;

      if (isCurrentChat) {
        dispatch(
          AddDirectMessage({
            id: message._id || message.id,
            temp_id: message.temp_id,
            type: "msg",
            subtype: message.type || message.subtype || "Text",
            message: message.text !== undefined ? message.text : message.message,
            file: message.file,
            fileName: message.fileName || "",
            song: message.song || null,
            reply: message.reply || "",
            starred: !!message.starred,
            reaction: message.reaction || "",
            deleted: !!message.deleted,
            status: message.status || (message.seen ? "seen" : "sent"),
            seen: Boolean(message.seen || message.status === "seen"),
            incoming,
            outgoing,
            from: (message.from?._id || message.from)?.toString(),
            to: (message.to?._id || message.to)?.toString(),
            created_at: message.created_at || message.createdAt || new Date().toISOString(),
          }),
        );

        if (incoming && isChatVisibleToUser) {
          socket.emit("mark_messages_seen", {
            conversation_id: data.conversation_id,
            user_id: current_user_id,
          });
        }
      }

      dispatch(
        UpdateConversationOnNewMessage({
          conversation_id: data.conversation_id,
          message,
          sender: data.sender,
          is_current: isChatVisibleToUser,
        }),
      );

      // Trigger notification & top pop-up for incoming message
      if (incoming) {
        const senderConv = (conversations_ref.current || []).find(
          (c) =>
            c.id?.toString() === data.conversation_id?.toString() ||
            c._id?.toString() === data.conversation_id?.toString()
        );
        const senderName =
          data.sender?.name ||
          senderConv?.name ||
          (message.from?.firstName
            ? `${message.from.firstName} ${message.from.lastName || ""}`.trim()
            : "New Message");
        const senderAvatar =
          data.sender?.avatar ||
          senderConv?.img ||
          message.from?.avatar ||
          "";

        let contentPreview = message.text || "";
        if (message.type === "Voice" || message.type === "Audio" || message.subtype === "voice") {
          contentPreview = "🎤 Voice message";
        } else if (!contentPreview) {
          if (message.type === "Media" || message.subtype === "img") {
            contentPreview = "📷 Photo";
          } else if (message.type === "Document" || message.subtype === "doc") {
            contentPreview = `📁 Document: ${message.fileName || "File"}`;
          } else if (message.type === "Sticker") {
            contentPreview = "🌟 Sticker";
          } else {
            contentPreview = "New message";
          }
        }

        const isMuted = isConversationMuted(data.conversation_id);
        const convUnread = (Number(senderConv?.unread) || 0) + (isChatVisibleToUser ? 0 : 1);
        const totalUnread =
          (conversations_ref.current || []).reduce(
            (sum, c) => sum + (Number(c.unread) || 0),
            0
          ) + (isChatVisibleToUser ? 0 : 1);

        if (!isMuted) {
          // Play signature chime sound (native ringtone on Android, crystal chime on web)
          playNotificationChime();

          // Haptic vibration
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            try {
              navigator.vibrate([70, 40, 70]);
            } catch {
              // ignore
            }
          }

          // 1. Show Top In-App Floating Popup Banner (when not currently in this chat, or window is hidden)
          if (!isChatVisibleToUser) {
            setInAppNotification({
              id: Date.now(),
              conversation_id: data.conversation_id,
              senderName,
              senderAvatar,
              contentPreview,
            });
          }

          // 2. WhatsApp-style Outside / Desktop Notification with Launcher Badge & visible unread count
          if (!isChatVisibleToUser) {
            showOutsideNotification({
              title: senderName,
              body: contentPreview,
              icon: senderAvatar,
              conversation_id: data.conversation_id,
              unreadCount: Math.max(1, convUnread),
              totalBadgeCount: Math.max(1, totalUnread),
              playSound: false, // Already chimed above
              onClick: () => {
                dispatch(SelectConversation({ room_id: data.conversation_id }));
                navigate("/app");
              },
            });
          } else {
            updateAppBadge(totalUnread);
          }
        } else {
          updateAppBadge(totalUnread);
        }
      }
    });

    // Message Deleted
    socket.on("message_deleted", (data) => {
      console.log("MESSAGE DELETED:", data);
      dispatch(DeleteDirectMessage(data));
    });

    // Message Reacted
    socket.on("message_reacted", (data) => {
      console.log("MESSAGE REACTED:", data);
      dispatch(ReactDirectMessage(data));
    });

    // Message Starred
    socket.on("message_starred", (data) => {
      console.log("MESSAGE STARRED:", data);
      dispatch(StarDirectMessage(data));
    });

    // Chat Deleted (on this device only)
    socket.on("chat_deleted", (data) => {
      console.log("CHAT DELETED:", data);
      dispatch(DeleteDirectConversation(data));
      if (room_id_ref.current && data.conversation_id && room_id_ref.current.toString() === data.conversation_id.toString()) {
        dispatch(SelectConversation({ room_id: null }));
      }
    });

    // Chat Cleared (on this device only)
    socket.on("chat_cleared", (data) => {
      console.log("CHAT CLEARED:", data);
      dispatch(ClearDirectMessages(data));
    });

    // Messages Seen (WhatsApp blue double ticks)
    socket.on("messages_seen", (data) => {
      console.log("MESSAGES SEEN:", data);
      dispatch(MarkMessagesSeen(data));
    });

    // Messages Delivered (WhatsApp double grey ticks)
    socket.on("messages_delivered", (data) => {
      console.log("MESSAGES DELIVERED:", data);
      dispatch(MarkMessagesDelivered(data));
    });

    // Start chat
    socket.on("start_chat", (data) => {
      console.log("START CHAT:", data);

      const existing_conversation = (conversations_ref.current || []).find(
        (el) => el?.id?.toString() === data._id?.toString(),
      );

      if (existing_conversation) {
        dispatch(
          UpdateDirectConversation({
            conversation: data,
          }),
        );
      } else {
        dispatch(
          AddDirectConversation({
            conversation: data,
          }),
        );
      }

      const current_user_id = user_id || window.localStorage.getItem("user_id");
      if (
        !data?.initiated_by ||
        data.initiated_by.toString() === current_user_id?.toString()
      ) {
        dispatch(
          SelectConversation({
            room_id: data._id,
          }),
        );
      }
    });

    // Call notification helpers for mobile heads-up banners & ringtones
    const triggerIncomingCallAlert = (data, callType) => {
      const fromUser = data?.from_user || {};
      const callerName =
        `${fromUser.firstName || ""} ${fromUser.lastName || ""}`.trim() ||
        data?.userName ||
        "Incoming Call";
      const roomID = (data?.roomID || data?.call_id || "").toString();
      const avatarUrl = fromUser.avatar || "";
      const callerId = (fromUser._id || data?.streamID || "").toString();

      // Native Android notification with heads-up banner, ringtone, and Answer/Decline buttons
      if (typeof window !== "undefined" && window.AndroidNotificationBridge?.showIncomingCall) {
        window.AndroidNotificationBridge.showIncomingCall(
          callerName,
          callType,
          roomID,
          avatarUrl,
          callerId
        );
      } else {
        // Fallback for web desktop notifications
        showOutsideNotification({
          title: `Incoming ${callType === "video" ? "Video" : "Audio"} Call`,
          body: `${callerName} is calling you...`,
          icon: avatarUrl,
          playSound: true,
        });
      }
    };

    const dismissIncomingCallAlert = () => {
      if (typeof window !== "undefined" && window.AndroidNotificationBridge?.dismissIncomingCall) {
        window.AndroidNotificationBridge.dismissIncomingCall();
      }
    };

    // Incoming audio call notification
    socket.on("audio_call_notification", (data) => {
      console.log("AUDIO CALL NOTIFICATION RECEIVED:", data);
      dispatch(PushToAudioCallQueue(data));
      triggerIncomingCallAlert(data, "audio");
    });

    // Incoming video call notification
    socket.on("video_call_notification", (data) => {
      console.log("VIDEO CALL NOTIFICATION RECEIVED:", data);
      dispatch(PushToVideoCallQueue(data));
      triggerIncomingCallAlert(data, "video");
    });

    // Dismiss incoming call notification when call is cancelled or missed
    socket.on("audio_call_denied", dismissIncomingCallAlert);
    socket.on("audio_call_missed", dismissIncomingCallAlert);
    socket.on("video_call_denied", dismissIncomingCallAlert);
    socket.on("video_call_missed", dismissIncomingCallAlert);
    socket.on("webrtc_call_ended", dismissIncomingCallAlert);

    // Handle Answer / Decline actions triggered directly from native Android notification bar
    const handleNativeCallAction = (event) => {
      const { action, roomId, callType, callerId, callerName } = event.detail || {};
      console.log("Native call action received from Android:", action, roomId, callType);

      dismissIncomingCallAlert();

      const callData = {
        roomID: roomId,
        call_id: roomId,
        streamID: callerId,
        userID: user_id,
        userName: callerName || "Caller",
        from_user: { _id: callerId, firstName: callerName || "Trackon", avatar: "" },
      };

      if (action === "answer") {
        if (callType === "video") {
          dispatch(PushToVideoCallQueue(callData));
          dispatch(UpdateVideoCallDialog({ state: true }));
          socket?.emit("video_call_accepted", { roomID: roomId, call_id: roomId });
        } else {
          dispatch(PushToAudioCallQueue(callData));
          dispatch(UpdateAudioCallDialog({ state: true }));
          socket?.emit("audio_call_accepted", { roomID: roomId, call_id: roomId });
        }
      } else if (action === "decline") {
        if (callType === "video") {
          dispatch(ResetVideoCallQueue());
          socket?.emit("video_call_denied", { roomID: roomId, call_id: roomId });
        } else {
          dispatch(ResetAudioCallQueue());
          socket?.emit("audio_call_denied", { roomID: roomId, call_id: roomId });
        }
      } else if (action === "open") {
        if (callType === "video") {
          dispatch(PushToVideoCallQueue(callData));
        } else {
          dispatch(PushToAudioCallQueue(callData));
        }
      }
    };
    window.addEventListener("native_call_action", handleNativeCallAction);

    // Bridge Logged-in User State to Android Native for Persistent Background Service
    if (isLoggedIn && user_id) {
      const token = window.localStorage.getItem("token") || "";
      if (typeof window !== "undefined" && window.AndroidNotificationBridge?.setLoggedInUser) {
        try {
          window.AndroidNotificationBridge.setLoggedInUser(user_id, token, BASE_URL);
        } catch (e) {
          console.warn("Could not set logged in user on Android bridge:", e);
        }
      }
    }

    // Direct Reply Listener from Android System Notification Bar
    const handleNativeDirectReply = (e) => {
      const { conversation_id, text } = e.detail || {};
      if (!conversation_id || !text) return;
      const temp_id = "reply_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
      socket.emit("text_message", {
        conversation_id,
        message: text,
        temp_id,
      });
      dispatch(
        AddDirectMessage({
          id: temp_id,
          temp_id,
          type: "msg",
          subtype: "Text",
          message: text,
          incoming: false,
          outgoing: true,
          created_at: new Date().toISOString(),
          conversation_id,
        })
      );
      dispatch(
        UpdateConversationOnNewMessage({
          conversation_id,
          message: text,
          time: new Date().toISOString(),
          unread: 0,
          outgoing: true,
        })
      );
      if (typeof window !== "undefined" && window.AndroidNotificationBridge?.clearConversationNotification) {
        window.AndroidNotificationBridge.clearConversationNotification(conversation_id);
      }
    };
    window.addEventListener("native_direct_reply", handleNativeDirectReply);

    // Check cold-started pending direct reply
    if (typeof window !== "undefined" && window.AndroidNotificationBridge?.getPendingDirectReply) {
      try {
        const pendingReplyStr = window.AndroidNotificationBridge.getPendingDirectReply();
        if (pendingReplyStr) {
          const pendingReply = JSON.parse(pendingReplyStr);
          handleNativeDirectReply({ detail: pendingReply });
        }
      } catch (err) {
        console.warn("Pending direct reply parse error:", err);
      }
    }


    // Check if cold-started by tapping Answer / Call notification from outer screen / home screen
    if (typeof window !== "undefined" && window.AndroidNotificationBridge?.getPendingCallAction) {
      try {
        const pendingStr = window.AndroidNotificationBridge.getPendingCallAction();
        if (pendingStr) {
          const pending = JSON.parse(pendingStr);
          window.AndroidNotificationBridge.clearPendingCallAction();
          handleNativeCallAction({ detail: pending });
        }
      } catch (err) {
        console.warn("Pending call action check warning:", err);
      }
    }

    // Automatically re-sync and re-connect when user returns to app from home screen or other apps
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (socket && !socket.connected) {
          socket.connect();
        }
        if (socket && user_id) {
          socket.emit("user_connected", { user_id });
          socket.emit("get_direct_conversations", { user_id }, (conversations) => {
            if (Array.isArray(conversations)) {
              dispatch(FetchDirectConversations({ conversations }));
            }
          });
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // New friend request received -> real-time notification + sound + refresh badge/list
    socket.on("new_friend_request", (data) => {
      const senderObj = data?.sender || {};
      const senderName =
        `${senderObj.firstName || ""} ${senderObj.lastName || ""}`.trim() ||
        "Someone";
      const senderAvatar = senderObj.avatar || "";
      const bodyText =
        data?.message || `${senderName} sent you a friend request`;

      dispatch(FetchFriendRequests());
      playNotificationChime();

      const openRequestsTab = () => {
        navigate("/app");
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("open_friend_requests_tab"));
        }, 50);
      };

      setInAppNotification({
        id: `fr_${data?.request_id || Date.now()}`,
        senderName: "New Friend Request",
        senderAvatar,
        contentPreview: `👋 ${senderName} sent you a friend request — Tap to view`,
        onClick: openRequestsTab,
      });

      showOutsideNotification({
        title: "New Friend Request",
        body: `👋 ${bodyText}`,
        icon: senderAvatar,
        playSound: false, // Already played chime above
        onClick: openRequestsTab,
      });

      dispatch(
        showSnackbar({
          severity: "info",
          message: `👋 ${bodyText}`,
        }),
      );
    });

    // Friend request accepted -> immediately add both users to each other's chat list + notify
    socket.on("request_accepted", (data) => {
      const current_user_id = (
        user_id || window.localStorage.getItem("user_id") || ""
      ).toString();

      if (data?.conversation) {
        const convId = (
          data.conversation._id || data.conversation.id
        )?.toString();
        const existing_conversation = (conversations_ref.current || []).find(
          (el) => el?.id?.toString() === convId,
        );

        if (existing_conversation) {
          dispatch(
            UpdateDirectConversation({
              conversation: data.conversation,
            }),
          );
        } else {
          dispatch(
            AddDirectConversation({
              conversation: data.conversation,
              setCurrent: false,
            }),
          );
        }
      }

      dispatch(FetchFriends());
      dispatch(FetchFriendRequests());
      dispatch(FetchUsers());
      dispatch(FetchDirectConversationsFromServer());

      const acceptedById = (
        data?.accepted_by?._id || data?.accepted_by || ""
      ).toString();
      const accepterName = data?.accepted_by
        ? `${data.accepted_by.firstName || ""} ${data.accepted_by.lastName || ""}`.trim() ||
          "Your friend"
        : "Your friend";
      const accepterAvatar = data?.accepted_by?.avatar || "";
      const convId = (
        data?.conversation?._id || data?.conversation?.id || ""
      ).toString();

      if (acceptedById && acceptedById !== current_user_id) {
        playNotificationChime();
        setInAppNotification({
          id: `fa_${data?.request_id || Date.now()}`,
          senderName: accepterName,
          senderAvatar: accepterAvatar,
          contentPreview: "✅ Accepted your friend request! Tap to start chatting",
          conversation_id: convId || undefined,
        });
        showOutsideNotification({
          title: "Friend Request Accepted",
          body: `✅ ${accepterName} accepted your friend request! Start chatting now.`,
          icon: accepterAvatar,
          conversation_id: convId || undefined,
          playSound: false,
          onClick: () => {
            if (convId) {
              dispatch(SelectConversation({ room_id: convId }));
            }
            navigate("/app");
          },
        });
      }

      dispatch(
        showSnackbar({
          severity: "success",
          message:
            data?.message ||
            "Friend request accepted! Added to your chat list.",
        }),
      );
    });

    // Friend request sent
    socket.on("request_sent", (data) => {
      dispatch(
        showSnackbar({
          severity: "success",
          message: data.message,
        }),
      );
    });

    // Status socket events
    socket.on("new_status", (data) => {
      dispatch(FetchAllStatuses());
      const authorId = (data?.author?._id || data?.author)?.toString();
      const current_user_id = user_id || window.localStorage.getItem("user_id");
      if (authorId && authorId !== current_user_id?.toString()) {
        const authorName = `${data.author?.firstName || "Someone"} ${data.author?.lastName || ""}`.trim();
        dispatch(
          showSnackbar({
            severity: "info",
            message: `${authorName} posted a new status!`,
          })
        );
      }
    });

    socket.on("status_deleted", () => {
      dispatch(FetchAllStatuses());
    });

    socket.on("status_viewed", (data) => {
      const current_user_id = user_id || window.localStorage.getItem("user_id");
      if (data?.authorId?.toString() === current_user_id?.toString()) {
        dispatch(FetchAllStatuses());
      }
    });

    // Listen for service worker notification click navigation
    const handleServiceWorkerMessage = (event) => {
      if (event.data?.type === "SELECT_CONVERSATION" && event.data?.conversation_id) {
        dispatch(SelectConversation({ room_id: event.data.conversation_id }));
      }
    };

    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    }

    // Cleanup
    return () => {
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
      }
      socket?.off("connect", handleSocketConnect);
      socket?.off("direct_conversations", handleDirectConversations);
      socket?.off("new_friend_request");
      socket?.off("request_accepted");
      socket?.off("request_sent");
      socket?.off("start_chat");
      socket?.off("new_message");
      socket?.off("message_deleted");
      socket?.off("chat_deleted");
      socket?.off("chat_cleared");
      socket?.off("message_reacted");
      socket?.off("message_starred");
      socket?.off("audio_call_notification");
      socket?.off("video_call_notification");
      socket?.off("audio_call_denied", dismissIncomingCallAlert);
      socket?.off("audio_call_missed", dismissIncomingCallAlert);
      socket?.off("video_call_denied", dismissIncomingCallAlert);
      socket?.off("video_call_missed", dismissIncomingCallAlert);
      socket?.off("webrtc_call_ended", dismissIncomingCallAlert);
      window.removeEventListener("native_call_action", handleNativeCallAction);
      window.removeEventListener("native_direct_reply", handleNativeDirectReply);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(bgMongoSyncInterval);
      socket?.off("new_status");
      socket?.off("status_deleted");
      socket?.off("status_viewed");
      socket?.off("messages_seen");
      socket?.off("messages_delivered");
    };
  }, [isLoggedIn, user_id, dispatch, navigate]);

  const handleRefreshApp = React.useCallback(async () => {
    try {
      if (!socket?.connected && user_id) {
        connectSocket(user_id);
      }

      await dispatch(FetchDirectConversationsFromServer());

      if (socket?.connected && user_id) {
        socket.emit("get_direct_conversations", { user_id }, (data) => {
          dispatch(FetchDirectConversations({ conversations: data || [] }));
        });
      }

      dispatch(FetchUserProfile());
      dispatch(FetchAllStatuses());

      window.dispatchEvent(new CustomEvent("app_refresh"));

      await new Promise((res) => setTimeout(res, 600));
    } catch (err) {
      console.error("App refresh error:", err);
    }
  }, [dispatch, user_id]);

  // If user is not logged in
  if (!isLoggedIn) {
    return <Navigate to="/auth/login" replace />;
  }



  // Show BottomNav on mobile when NOT inside an active chat conversation
  const isInsideChat =
    location.pathname.toLowerCase().startsWith("/app") && room_id !== null;

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: isDesktop ? "row" : "column",
          width: "100%",
          maxWidth: "100vw",
          height: "100%",
          maxHeight: "100%",
          minHeight: 0,
          overflow: "hidden",
          backgroundColor:
            theme.palette.mode === "light"
              ? "#F8FAFF"
              : theme.palette.background.paper,
          pt: isDesktop ? 0 : "var(--safe-top, 0px)",
        }}
      >
        {isDesktop && <SideBar />}

        <Box
          sx={{
            flex: 1,
            width: "100%",
            height: "100%",
            minWidth: 0,
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            position: "relative",
          }}
        >
          <PullToRefresh onRefresh={handleRefreshApp}>
            <Outlet />
          </PullToRefresh>
        </Box>

        {!isDesktop && !isInsideChat && <BottomNav />}

        {/* First Time Account Notification Permission Pop-up */}
        <FirstTimeNotificationDialog />

        {/* Top In-App Floating Message Notification Popup */}
        <InAppNotification
          notification={inAppNotification}
          onClose={() => setInAppNotification(null)}
          onOpen={(cid) => {
            dispatch(SelectConversation({ room_id: cid }));
            navigate("/app");
          }}
        />
      </Box>

      {/* Audio call notification */}
      {open_audio_notification_dialog && (
        <AudioCallNotification
          open={open_audio_notification_dialog}
          handleClose={handleCloseAudioNotificationDialog}
        />
      )}

      {/* Audio call dialog */}
      {open_audio_dialog && (
        <AudioCallDialog
          open={open_audio_dialog}
          handleClose={handleCloseAudioDialog}
        />
      )}

      {/* Video call notification */}
      {open_video_notification_dialog && (
        <VideoCallNotification
          open={open_video_notification_dialog}
          handleClose={handleCloseVideoNotificationDialog}
        />
      )}

      {/* Video call dialog */}
      {open_video_dialog && (
        <VideoCallDialog
          open={open_video_dialog}
          handleClose={handleCloseVideoDialog}
        />
      )}
    </>
  );
};

export default DashboardLayout;

