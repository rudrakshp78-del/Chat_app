import { PushNotifications } from "@capacitor/push-notifications";
import { socket } from "../socket";
import { BASE_URL } from "../config";

let pushInitialized = false;

/**
 * Send FCM push token to the backend via Socket & HTTP
 */
export const syncFcmTokenWithBackend = (userId, tokenValue) => {
  if (!userId || !tokenValue) return;

  // 1. Socket emit if connected
  try {
    if (socket && socket.connected) {
      socket.emit("save_fcm_token", {
        user_id: userId,
        fcm_token: tokenValue,
      });
    }
  } catch (e) {}

  // 2. Direct HTTP fallback to guarantee the token is saved in DB
  try {
    const authToken =
      window.localStorage.getItem("token") ||
      window.localStorage.getItem("accessToken");
    fetch(`${BASE_URL}/user/save-fcm-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ user_id: userId, fcm_token: tokenValue }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("✅ FCM token synced with backend:", data?.message || "OK");
      })
      .catch((err) => {
        console.warn("FCM token HTTP sync warning:", err?.message || err);
      });
  } catch (err) {}
};

/**
 * Initialize native push notifications (FCM)
 * Registers device with Firebase and sends token to backend
 * @param {string} userId - Current logged in user ID
 */
export const initPushNotifications = async (userId) => {
  if (typeof window === "undefined" || !userId) return;

  // If a token was already saved on this device, sync it immediately with current user
  const existingToken = window.localStorage.getItem("fcm_token");
  if (existingToken) {
    syncFcmTokenWithBackend(userId, existingToken);
  }

  if (pushInitialized) return;

  try {
    // 1. Check if running inside native Capacitor mobile environment
    const isNative =
      typeof window.Capacitor !== "undefined" &&
      typeof window.Capacitor.isNativePlatform === "function" &&
      window.Capacitor.isNativePlatform();

    if (!isNative) {
      return;
    }

    console.log("📲 Initializing native push notifications for user:", userId);

    // 2. Clear old listeners to prevent duplicate triggers
    try {
      await PushNotifications.removeAllListeners();
    } catch (e) {}

    // 3. IMPORTANT: Register listeners BEFORE calling register() so no events are missed
    PushNotifications.addListener("registration", (token) => {
      console.log("📲 FCM Push Token generated:", token?.value);
      if (token && token.value) {
        window.localStorage.setItem("fcm_token", token.value);
        syncFcmTokenWithBackend(userId, token.value);
      }
    });

    PushNotifications.addListener("registrationError", (error) => {
      console.warn("⚠️ FCM push registration notice:", error);
    });

    // 4. In-app foreground push handler
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("📲 Foreground push notification received:", notification);
      const data = notification?.data || {};

      // If this is an incoming call notification received via FCM
      if (data.type === "incoming_call" && typeof window !== "undefined") {
        const callerName = data.caller_name || notification.title || "Incoming Call";
        const callType = data.call_type || "audio";
        const roomID = data.roomID || data.room_id || "";
        const avatarUrl = data.caller_avatar || "";
        const callerId = data.caller_id || "";

        if (window.AndroidNotificationBridge?.showIncomingCall) {
          window.AndroidNotificationBridge.showIncomingCall(
            callerName,
            callType,
            roomID,
            avatarUrl,
            callerId
          );
        }
      }
    });

    // 5. Action handler (user tapped the notification from home screen / notification tray)
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("📲 Push notification action performed:", action);
      const data = action?.notification?.data || {};

      if (data.type === "incoming_call") {
        window.dispatchEvent(
          new CustomEvent("native_call_action", {
            detail: {
              action: "answer",
              roomId: data.roomID || data.room_id,
              callType: data.call_type || "audio",
              callerId: data.caller_id,
              callerName: data.caller_name,
            },
          })
        );
        return;
      }

      const conversationId = data.conversation_id || data.conversationId;
      if (conversationId && typeof window.__openConversation === "function") {
        window.__openConversation(conversationId);
      }
    });

    // 6. Check and request notification permissions
    try {
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus?.receive === "prompt") {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus?.receive !== "granted") {
        console.warn("⚠️ Push notification permission not granted by user.");
        return;
      }

      // 7. Register device with FCM / Google Play Services
      await PushNotifications.register();
      pushInitialized = true;
      console.log("📲 PushNotifications.register() called successfully");
    } catch (pushErr) {
      console.warn("⚠️ FCM push registration note (e.g. google-services.json setup):", pushErr?.message || pushErr);
    }
  } catch (err) {
    console.warn("initPushNotifications error:", err?.message || err);
  }
};
