import React, { useEffect } from "react";
import { Stack } from "@mui/material";
import { Navigate, Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import useResponsive from "../../hooks/useResponsive";
import SideBar from "./sidebar";

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
  FetchDirectConversations,
} from "../../redux/slices/Conversation";

import { UpdateVideoCallDialog } from "../../redux/slices/videoCall";

import AudioCallNotification from "../../sections/dashboard/Audio/CallNotification";
import VideoCallNotification from "../../sections/dashboard/video/CallNotification";

import AudioCallDialog from "../../sections/dashboard/Audio/CallDialog";
import VideoCallDialog from "../../sections/dashboard/video/CallDialog";

const DashboardLayout = () => {
  const isDesktop = useResponsive("up", "md");

  const dispatch = useDispatch();

  const { user_id, isLoggedIn } = useSelector((state) => state.auth);

  const { conversations } = useSelector(
    (state) => state.conversation.direct_chat,
  );

  const reduxState = useSelector((state) => state);

  console.log("🔥 FULL REDUX STATE:", reduxState);
  console.log("🔥 AUDIO CALL STATE:", reduxState.audioCall);

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

  // Fetch user profile
  useEffect(() => {
    if (isLoggedIn) {
      dispatch(FetchUserProfile());
    }
  }, [dispatch, isLoggedIn]);

  // Close video call dialog
  const handleCloseVideoDialog = () => {
    dispatch(UpdateVideoCallDialog({ state: false }));
  };

  // Socket events
  useEffect(() => {
    if (!isLoggedIn || !user_id) {
      return;
    }

    if (!socket.connected) {
      connectSocket(user_id);
    }

    // New message
    socket.on("new_message", (data) => {
      const message = data.message;

      console.log("NEW MESSAGE:", data);

      const current_user_id = user_id || window.localStorage.getItem("user_id");
      const fromId = (message.from?._id || message.from)?.toString();
      const outgoing = fromId === current_user_id?.toString();
      const incoming = !outgoing;

      if (
        current_conversation?.id?.toString() === data.conversation_id?.toString() ||
        room_id?.toString() === data.conversation_id?.toString()
      ) {
        dispatch(
          AddDirectMessage({
            id: message._id,
            type: "msg",
            subtype: message.type,
            message: message.text,
            incoming,
            outgoing,
          }),
        );
      }
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
    };
  }, [isLoggedIn, user_id, dispatch, current_conversation, conversations, room_id]);

  // If user is not logged in
  if (!isLoggedIn) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <>
      <Stack direction="row">
        {isDesktop && <SideBar />}

        <Outlet />
      </Stack>

      {/* Audio call notification */}
      {open_audio_notification_dialog && (
        <AudioCallNotification open={open_audio_notification_dialog} />
      )}

      {/* Audio call dialog */}
      {open_audio_dialog && <AudioCallDialog open={open_audio_dialog} />}

      {/* Video call notification */}
      {open_video_notification_dialog && (
        <VideoCallNotification open={open_video_notification_dialog} />
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
