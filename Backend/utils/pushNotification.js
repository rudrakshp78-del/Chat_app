const path = require("path");
const fs = require("fs");
const User = require("../models/user");

let admin = null;
let firebaseInitialized = false;

// Initialize Firebase Admin SDK safely
function initFirebase() {
  if (firebaseInitialized) return admin;

  try {
    admin = require("firebase-admin");

    // 1. Check if raw JSON string is provided in environment variables
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        firebaseInitialized = true;
        console.log("✅ Firebase Admin SDK initialized successfully via FIREBASE_SERVICE_ACCOUNT_JSON");
        return admin;
      } catch (e) {
        console.warn("⚠️ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", e.message);
      }
    }

    // 2. Check potential file paths for Firebase service account credential JSON
    const possiblePaths = [
      process.env.FIREBASE_SERVICE_ACCOUNT,
      path.join(__dirname, "..", "serviceAccountKey.json"),
      path.join(__dirname, "..", "config", "serviceAccountKey.json"),
      path.join(__dirname, "..", "firebase-service-account.json"),
      path.join(process.cwd(), "serviceAccountKey.json"),
      path.join(process.cwd(), "Backend", "serviceAccountKey.json"),
      path.join(__dirname, "..", "..", "serviceAccountKey.json"),
    ].filter(Boolean);

    let keyPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        keyPath = p;
        break;
      }
    }

    if (keyPath) {
      const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firebaseInitialized = true;
      console.log("✅ Firebase Admin SDK initialized successfully for background Push Notifications from:", keyPath);
    } else {
      console.log("ℹ️ Push Notification Notice: serviceAccountKey.json not found in Backend. Background push when app is closed will be active as soon as you place your serviceAccountKey.json in Backend/ or set FIREBASE_SERVICE_ACCOUNT_JSON in config.env.");
    }
  } catch (err) {
    console.warn("⚠️ Firebase Admin initialization note:", err.message);
  }

  return admin;
}

// Immediately attempt initialization
initFirebase();

/**
 * Send an FCM Push Notification to a user device
 * @param {Object} params
 * @param {string} params.userId - Recipient user MongoDB _id
 * @param {string} params.title - Notification title (e.g. sender name)
 * @param {string} params.body - Notification body (message text)
 * @param {Object} [params.data] - Custom data payload
 * @param {number} [params.badgeCount] - Number to display on app icon badge
 * @param {string} [params.channelId] - Custom notification channel ID
 */
async function sendPushNotificationToUser({ userId, title, body, data = {}, badgeCount, channelId }) {
  try {
    if (!firebaseInitialized) {
      initFirebase();
      if (!firebaseInitialized) {
        console.warn(`⚠️ [Push] Firebase Admin is not initialized. Place serviceAccountKey.json in Backend/ or set FIREBASE_SERVICE_ACCOUNT_JSON in config.env to enable notifications when app is closed.`);
        return false;
      }
    }

    if (!userId) return false;

    const user = await User.findById(userId).select("fcm_token firstName lastName");
    if (!user || !user.fcm_token) {
      console.log(`ℹ️ [Push] User ${userId} (${user ? user.firstName : 'unknown'}) has no fcm_token registered in DB.`);
      return false;
    }

    const notifTitle = title || "Trackon";
    const notifBody = body || "New message received";

    // Convert all data values to strings for FCM
    const stringData = {
      title: notifTitle,
      body: notifBody,
    };
    for (const key of Object.keys(data)) {
      stringData[key] = data[key] !== undefined && data[key] !== null ? String(data[key]) : "";
    }

    const count = typeof badgeCount === "number" && badgeCount >= 0 ? badgeCount : 1;
    const isCall = data.type === "incoming_call" || channelId === "trackon_call_channel_v1";
    const selectedChannel = channelId || (isCall ? "trackon_call_channel_v1" : "trackon_chat_channel_v6");

    const message = {
      token: user.fcm_token,
      notification: {
        title: notifTitle,
        body: notifBody,
      },
      data: stringData,
      android: {
        priority: "high",
        notification: {
          channelId: selectedChannel,
          sound: "default",
          notificationCount: count,
          defaultSound: true,
          defaultVibrateTimings: true,
          visibility: "public",
          icon: "ic_stat_notification",
          priority: isCall ? "max" : "high",
          tag: isCall && data.roomID ? `call_${data.roomID}` : undefined,
        },
      },
      apns: {
        payload: {
          aps: {
            badge: count,
            sound: "default",
            contentAvailable: true,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log("📲 FCM Push Notification sent to user:", userId, "response:", response);
    return true;
  } catch (err) {
    console.warn("FCM push send error for user", userId, ":", err.message);

    // If the token is invalid or expired, clear it from database
    if (
      err.code === "messaging/registration-token-not-registered" ||
      err.code === "messaging/invalid-registration-token"
    ) {
      try {
        await User.findByIdAndUpdate(userId, { fcm_token: "" });
      } catch (e) {}
    }
    return false;
  }
}

module.exports = {
  sendPushNotificationToUser,
  initFirebase,
};
