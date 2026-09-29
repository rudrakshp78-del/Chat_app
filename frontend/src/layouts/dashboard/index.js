import React, { useEffect } from "react";
import { Box } from "@mui/material";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import useResponsive from "../../hooks/useResponsive";
import SideBar from "./sidebar";
import BottomNav from "./BottomNav";

import {
  FetchUserProfile,
  SelectConversation,
  showSnackbar,
} from "../../redux/slices/app";

import { socket, connectSocket } from "../../socket";

import {
  UpdateDirectConversation,
  AddDirectConversation,
  AddDirectMessage,
  UpdateConversationOnNewMessage,
  DeleteDirectMessage,
  ReactDirectMessage,
  StarDirectMessage,
  DeleteDirectConversation,
  ClearDirectMessages,
} from "../../redux/slices/Conversation";

import {
  CloseAudioNotificationDialog,
  PushToAudioCallQueue,
  UpdateAudioCallDialog,
} from "../../redux/slices/audioCall";

import {
  CloseVideoNotificationDialog,
  PushToVideoCallQueue,
  UpdateVideoCallDialog,
} from "../../redux/slices/videoCall";

import AudioCallNotification from "../../sections/dashboard/Audio/CallNotification";
import VideoCallNotification from "../../sections/dashboard/video/CallNotification";

import AudioCallDialog from "../../sections/dashboard/Audio/CallDialog";
import VideoCallDialog from "../../sections/dashboard/video/CallDialog";

const DashboardLayout = () => {
  const isDesktop = useResponsive("up", "md");
  const location = useLocation();

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

  const { room_id } = useSelector((state) => state.app);

  // Request notification permissions
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Fetch user profile
  useEffect(() => {
    if (isLoggedIn) {
      dispatch(FetchUserProfile());
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

    if (!socket.connected) {
      connectSocket(user_id);
    } else {
      socket.emit("user_connected", { user_id });
    }

    socket.on("connect", () => {
      socket.emit("user_connected", { user_id });
    });

    // New message
    socket.on("new_message", (data) => {
      const message = data.message;
      if (!message) return;

      console.log("NEW MESSAGE:", data);

      const current_user_id = user_id || window.localStorage.getItem("user_id");
      const fromId = (message.from?._id || message.from)?.toString();
      const outgoing = fromId === current_user_id?.toString();
      const incoming = !outgoing;

      const isCurrentChat =
        current_conversation?.id?.toString() === data.conversation_id?.toString() ||
        room_id?.toString() === data.conversation_id?.toString();

      if (isCurrentChat) {
        dispatch(
          AddDirectMessage({
            id: message._id,
            type: "msg",
            subtype: message.type,
            message: message.text,
            file: message.file,
            reply: message.reply || "",
            starred: !!message.starred,
            reaction: message.reaction || "",
            deleted: !!message.deleted,
            incoming,
            outgoing,
            from: (message.from?._id || message.from)?.toString(),
            to: (message.to?._id || message.to)?.toString(),
          }),
        );
      }

      dispatch(
        UpdateConversationOnNewMessage({
          conversation_id: data.conversation_id,
          message,
          is_current: isCurrentChat,
        }),
      );

      // Trigger notification for incoming message
      if (incoming) {
        const senderConv = (conversations || []).find(
          (c) =>
            c.id?.toString() === data.conversation_id?.toString() ||
            c._id?.toString() === data.conversation_id?.toString()
        );
        const senderName = senderConv?.name || "New Message";
        const contentPreview =
          message.text || (message.file ? "Sent an attachment" : "New message");

        // 1. In-app Snackbar notification
        dispatch(
          showSnackbar({
            severity: "info",
            message: `${senderName}: ${contentPreview}`,
          })
        );

        // 2. Browser Desktop Notification (when backgrounded or minimized)
        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "granted") {
            try {
              new Notification(senderName, {
                body: contentPreview,
                icon: senderConv?.img || "/favicon.ico",
              });
            } catch (err) {
              console.log("Notification error:", err);
            }
          }
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
      if (room_id && data.conversation_id && room_id.toString() === data.conversation_id.toString()) {
        dispatch(SelectConversation({ room_id: null }));
      }
    });

    // Chat Cleared (on this device only)
    socket.on("chat_cleared", (data) => {
      console.log("CHAT CLEARED:", data);
      dispatch(ClearDirectMessages(data));
    });

    // Start chat
    socket.on("start_chat", (data) => {
      console.log("START CHAT:", data);

      const existing_conversation = conversations.find(
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

      dispatch(
        SelectConversation({
          room_id: data._id,
        }),
      );
    });

    // Incoming audio call notification
    socket.on("audio_call_notification", (data) => {
      console.log("AUDIO CALL NOTIFICATION RECEIVED:", data);
      dispatch(PushToAudioCallQueue(data));
    });

    // Incoming video call notification
    socket.on("video_call_notification", (data) => {
      console.log("VIDEO CALL NOTIFICATION RECEIVED:", data);
      dispatch(PushToVideoCallQueue(data));
    });

    // New friend request
    socket.on("new_friend_request", () => {
      dispatch(
        showSnackbar({
          severity: "success",
          message: "New friend request received",
        }),
      );
    });

    // Friend request accepted
    socket.on("request_accepted", () => {
      dispatch(
        showSnackbar({
          severity: "success",
          message: "Friend Request Accepted",
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

    // Cleanup
    return () => {
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
    };
  }, [isLoggedIn, user_id, dispatch, current_conversation, conversations, room_id]);

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
          width: "100vw",
          height: { xs: "100dvh", md: "100vh" },
          overflow: "hidden",
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
          }}
        >
          <Outlet />
        </Box>

        {!isDesktop && !isInsideChat && <BottomNav />}
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
