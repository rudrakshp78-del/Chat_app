import { createSlice } from "@reduxjs/toolkit";
import axios from "../../utils/axios";
import { showSnackbar } from "./app";

const initialState = {
  isLoading: false,
  error: null,
  myStatuses: [], // list of current user's active statuses
  otherStatuses: [], // list of other users' active statuses grouped: [{ user, statuses, allViewed, latestStatusAt }]
};

const slice = createSlice({
  name: "status",
  initialState,
  reducers: {
    setLoading(state, action) {
      state.isLoading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
      state.isLoading = false;
    },
    setStatuses(state, action) {
      state.myStatuses = action.payload.myStatuses || [];
      state.otherStatuses = action.payload.otherStatuses || [];
      state.isLoading = false;
      state.error = null;
    },
    statusViewedLocal(state, action) {
      const { statusId, currentUserId } = action.payload;
      // Mark as viewed locally in otherStatuses
      state.otherStatuses.forEach((group) => {
        let allViewedNow = true;
        group.statuses.forEach((st) => {
          if (st._id === statusId) {
            const alreadyIn = (st.viewers || []).some(
              (v) => (v.user?._id || v.user)?.toString() === currentUserId?.toString()
            );
            if (!alreadyIn) {
              st.viewers = [
                ...(st.viewers || []),
                { user: { _id: currentUserId }, viewedAt: new Date().toISOString() },
              ];
            }
          }
          const isViewed = (st.viewers || []).some(
            (v) => (v.user?._id || v.user)?.toString() === currentUserId?.toString()
          );
          if (!isViewed) {
            allViewedNow = false;
          }
        });
        group.allViewed = allViewedNow;
      });
    },
  },
});

export const { setStatuses, setLoading, setError, statusViewedLocal } = slice.actions;
export default slice.reducer;

// Fetch all active statuses
export const FetchAllStatuses = () => {
  return async (dispatch, getState) => {
    dispatch(setLoading(true));
    try {
      const token = getState().auth.token;
      const response = await axios.get("/status/all", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      dispatch(
        setStatuses({
          myStatuses: response.data.data.myStatuses,
          otherStatuses: response.data.data.otherStatuses,
        })
      );
    } catch (err) {
      console.error("FetchAllStatuses error:", err);
      dispatch(setError(err?.message || "Failed to fetch statuses"));
    }
  };
};

// Create a new status
export const CreateStatus = (statusData) => {
  return async (dispatch, getState) => {
    dispatch(setLoading(true));
    try {
      const token = getState().auth.token;
      const response = await axios.post("/status/create", statusData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      dispatch(
        showSnackbar({
          severity: "success",
          message: "Status posted! Everyone can now see it.",
        })
      );

      // Refresh list
      dispatch(FetchAllStatuses());
      return response.data;
    } catch (err) {
      console.error("CreateStatus error:", err);
      dispatch(setError(err?.message || "Failed to post status"));
      dispatch(
        showSnackbar({
          severity: "error",
          message: err?.message || "Could not post status. Please try again.",
        })
      );
      throw err;
    }
  };
};

// Mark a status as viewed
export const MarkStatusViewed = (statusId) => {
  return async (dispatch, getState) => {
    try {
      const token = getState().auth.token;
      const currentUserId = getState().auth.user_id;

      dispatch(statusViewedLocal({ statusId, currentUserId }));

      await axios.post(
        `/status/view/${statusId}`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (err) {
      console.error("MarkStatusViewed error:", err);
    }
  };
};

// Delete a status
export const DeleteStatus = (statusId) => {
  return async (dispatch, getState) => {
    try {
      const token = getState().auth.token;
      await axios.delete(`/status/${statusId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      dispatch(
        showSnackbar({
          severity: "success",
          message: "Status deleted successfully",
        })
      );

      dispatch(FetchAllStatuses());
    } catch (err) {
      console.error("DeleteStatus error:", err);
      dispatch(
        showSnackbar({
          severity: "error",
          message: err?.message || "Failed to delete status",
        })
      );
    }
  };
};
