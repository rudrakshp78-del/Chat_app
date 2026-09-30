// WhatsApp-style Desktop & System Notification Manager

let swRegistration = null;
let originalDocumentTitle = typeof document !== "undefined" ? document.title || "Chat App" : "Chat App";
let unreadCount = 0;
let titleInterval = null;

// 1. Initialize Service Worker for persistent outside/background notifications
export const initServiceWorker = async () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js");
    console.log("✅ Notification Service Worker registered:", swRegistration.scope);
    return swRegistration;
  } catch (err) {
    console.log("Service Worker registration notice:", err.message);
    return null;
  }
};

// 2. Check current notification permission
export const getNotificationPermission = () => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission; // 'granted', 'denied', or 'default'
};

// 3. Request permission explicitly via User Gesture
export const requestNotificationPermission = async () => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      // Play a quick test confirmation chime
      playNotificationChime();
      return true;
    }
    return false;
  } catch (err) {
    console.error("requestNotificationPermission error:", err);
    return false;
  }
};

// 4. Play WhatsApp signature dual-tone message chime via Web Audio API
export const playNotificationChime = () => {
  if (typeof window === "undefined") return;

  // Check if sound is disabled in settings
  const soundEnabled = window.localStorage.getItem("chat_sound_enabled");
  if (soundEnabled === "false") return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // First chime note: G5 (784Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(784, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // Second chime note: C6 (1046.5Hz) - creates WhatsApp's distinct high chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1046.5, now + 0.08);
    gain2.gain.setValueAtTime(0.28, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.38);
  } catch (e) {
    console.log("Audio chime note:", e.message);
  }
};

// 5. Update browser tab title badge when minimized / in background
export const updateTabTitleBadge = (senderName, messageText) => {
  if (typeof document === "undefined") return;

  unreadCount += 1;
  const badgeTitle = `(${unreadCount}) ${senderName}: ${messageText.slice(0, 20)}`;

  if (titleInterval) {
    clearInterval(titleInterval);
  }

  let toggle = false;
  document.title = badgeTitle;

  titleInterval = setInterval(() => {
    if (document.hidden) {
      document.title = toggle ? badgeTitle : `(${unreadCount}) New message!`;
      toggle = !toggle;
    } else {
      clearTabTitleBadge();
    }
  }, 1200);
};

export const clearTabTitleBadge = () => {
  if (typeof document === "undefined") return;
  unreadCount = 0;
  if (titleInterval) {
    clearInterval(titleInterval);
    titleInterval = null;
  }
  document.title = originalDocumentTitle;
};

// Listen for window focus to clear tab badge
if (typeof window !== "undefined") {
  window.addEventListener("focus", clearTabTitleBadge);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      clearTabTitleBadge();
    }
  });
}

// 6. Show Outside / Desktop Notification (Windows Action Center, Mac, Android)
export const showOutsideNotification = async ({
  title,
  body,
  icon,
  conversation_id,
  onClick,
}) => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  // Always play notification sound if user is outside this chat or window is in background
  playNotificationChime();

  // If window is backgrounded or minimized, update title
  if (document.hidden) {
    updateTabTitleBadge(title, body);
  }

  // Check if system notification permission is granted
  if (Notification.permission !== "granted") {
    console.log("Desktop notification skipped: permission is", Notification.permission);
    return false;
  }

  // Choose a clean fallback icon for Windows / system trays
  const notificationIcon = icon && !icon.includes("api.dicebear.com")
    ? icon
    : "/logo192.png";

  const options = {
    body: body || "New message received",
    icon: notificationIcon,
    badge: "/favicon.ico",
    tag: conversation_id ? `chat_${conversation_id}` : "chat_msg",
    renotify: true,
    silent: false, // let system sound / chime play
    data: {
      conversation_id,
      url: "/app",
    },
  };

  try {
    // 1) Try via ServiceWorkerRegistration (standard for background tabs, Windows, Android)
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        return true;
      }
    }

    // 2) Fallback to window.Notification
    const notification = new Notification(title, options);

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      notification.close();
      if (onClick) {
        onClick();
      }
    };

    return true;
  } catch (err) {
    console.warn("showOutsideNotification fallback note:", err.message);

    // Fallback attempt with bare minimum options if OS rejects full options
    try {
      const simpleNotification = new Notification(title, {
        body: body || "New message",
        icon: "/favicon.ico",
      });
      simpleNotification.onclick = () => {
        window.focus();
        simpleNotification.close();
        if (onClick) onClick();
      };
      return true;
    } catch (e) {
      console.error("Native notification failed:", e);
      return false;
    }
  }
};
