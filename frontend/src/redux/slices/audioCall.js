import { createSlice } from "@reduxjs/toolkit";
import { socket } from "../../socket";
import axios from "../../utils/axios";
import { showSnackbar } from "./app";

const initialState = {
  open_audio_dialog: false,
  open_audio_notification_dialog: false,
  call_queue: [], // can have max 1 call at any point of time
  incoming: false,
};

const slice = createSlice({
  name: "audioCall",
  initialState,
  reducers: {
    pushToAudioCallQueue(state, action) {
      const incomingCall = action.payload.call;
      const isDialogActive =
        Boolean(state.open_audio_dialog) ||
        Boolean(state.open_audio_notification_dialog);

      if (state.call_queue.length === 0 || !isDialogActive) {
        state.call_queue = [incomingCall];
        if (action.payload.incoming) {
          state.open_audio_notification_dialog = true; // this will open up the call notification dialog
          state.open_audio_dialog = false;
          state.incoming = true;
        } else {
          state.open_audio_dialog = true;
          state.open_audio_notification_dialog = false;
          state.incoming = false;
        }
      } else {
        const currentRoom =
          state.call_queue[0]?.roomID || state.call_queue[0]?.call_id;
        const incomingRoom = incomingCall?.roomID || incomingCall?.call_id;
        if (
          currentRoom &&
          incomingRoom &&
          currentRoom.toString() === incomingRoom.toString()
        ) {
          // Ignore duplicate notification for the same active call
          return;
        }
        // if queue is not empty then emit user_is_busy => in turn server will send this event to sender of call
        socket.emit("user_is_busy_audio_call", { ...action.payload });
      }
    },
    resetAudioCallQueue(state, action) {
      state.call_queue = [];
      state.open_audio_dialog = false;
      state.open_audio_notification_dialog = false;
      state.incoming = false;
    },
    closeNotificationDialog(state, action) {
      state.open_audio_notification_dialog = false;
    },
    updateCallDialog(state, action) {
      state.open_audio_dialog = action.payload.state;
      state.open_audio_notification_dialog = false;
    },
  },
});

// Reducer
export default slice.reducer;

// ----------------------------------------------------------------------

export const StartAudioCall = (id) => {
  return async (dispatch, getState) => {
    dispatch(slice.actions.resetAudioCallQueue());

    const token =
      getState().auth?.token ||
      (typeof window !== "undefined"
        ? window.localStorage.getItem("token") ||
          window.localStorage.getItem("accessToken")
        : null);

    if (!token) {
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Please log in again to make calls",
        })
      );
      return;
    }

    axios
      .post(
        "/user/start-audio-call",
        { id },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      )
      .then((response) => {
        console.log("start-audio-call response:", response);
        dispatch(
          slice.actions.pushToAudioCallQueue({
            call: response.data.data,
            incoming: false,
          })
        );
      })
      .catch((err) => {
        console.error("StartAudioCall error:", err);
        const errMsg =
          err?.message ||
          err?.response?.data?.message ||
          (typeof err === "string"
            ? err
            : "Failed to initiate voice call. Please try again.");
        dispatch(
          showSnackbar({
            severity: "error",
            message: errMsg,
          })
        );
      });
  };
};



export const PushToAudioCallQueue = (call) => {
  return async (dispatch, getState) => {
    dispatch(slice.actions.pushToAudioCallQueue({ call, incoming: true }));
  };
};

export const ResetAudioCallQueue = () => {
  return async (dispatch, getState) => {
    dispatch(slice.actions.resetAudioCallQueue());
  };
};

export const CloseAudioNotificationDialog = () => {
  return async (dispatch, getState) => {
    dispatch(slice.actions.closeNotificationDialog());
  };
};

export const UpdateAudioCallDialog = ({ state }) => {
  return async (dispatch, getState) => {
    dispatch(slice.actions.updateCallDialog({ state }));
  };
};