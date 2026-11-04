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
  // 1. Native Android runtime permission for Android 13+ (API 33+)
  if (typeof window !== "undefined" && window.AndroidNotificationBridge?.requestPermission) {
    try {
      window.AndroidNotificationBridge.requestPermission();
    } catch (e) {
      console.warn("Android native permission request note:", e);
    }
  }

  // 2. Web Notification permission
  if (typeof window !== "undefined" && "Notification" in window) {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        playNotificationSong();
        return true;
      }
    } catch (err) {
      console.error("requestNotificationPermission error:", err);
    }
  }

  if (typeof window !== "undefined" && window.AndroidNotificationBridge?.hasPermission) {
    try {
      if (window.AndroidNotificationBridge.hasPermission()) {
        playNotificationSong();
        return true;
      }
    } catch (e) {}
  }

  return false;
};

// 4. Play melodic notification chime song via Web Audio API
export const playNotificationSong = () => {
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

    // Ascending 4-note musical crystal chime: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
    const melody = [
      { freq: 523.25, time: 0.00, dur: 0.15, gain: 0.22 },
      { freq: 659.25, time: 0.09, dur: 0.17, gain: 0.25 },
      { freq: 783.99, time: 0.18, dur: 0.19, gain: 0.28 },
      { freq: 1046.50, time: 0.27, dur: 0.45, gain: 0.32 },
    ];

    melody.forEach((note) => {
      // Fundamental pure sine tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(note.freq, now + note.time);
      gain.gain.setValueAtTime(note.gain, now + note.time);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.time + note.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.time);
      osc.stop(now + note.time + note.dur);

      // Sweet harmonic bell overtone (triangle wave)
      const overtone = ctx.createOscillator();
      const overGain = ctx.createGain();
      overtone.type = "triangle";
      overtone.frequency.setValueAtTime(note.freq * 2, now + note.time);
      overGain.gain.setValueAtTime(note.gain * 0.35, now + note.time);
      overGain.gain.exponentialRampToValueAtTime(0.0001, now + note.time + note.dur * 0.7);
      overtone.connect(overGain);
      overGain.connect(ctx.destination);
      overtone.start(now + note.time);
      overtone.stop(now + note.time + note.dur * 0.7);
    });
  } catch (e) {
    console.log("Audio notification song note:", e.message);
  }
};

// Aliased for full backwards compatibility
export const playNotificationChime = playNotificationSong;

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
  if (typeof window === "undefined") {
    return false;
  }

  // Always play notification sound and haptic feedback
  playNotificationChime();
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate([80, 40, 80]);
    } catch {
      // ignore
    }
  }

  // 1. Post to native Android system notification bar if running inside Android app
  if (typeof window !== "undefined" && window.AndroidNotificationBridge?.showNotification) {
    try {
      window.AndroidNotificationBridge.showNotification(
        title || "Trackon",
        body || "New message received",
        conversation_id ? String(conversation_id) : ""
      );
    } catch (e) {
      console.warn("Android native notification post error:", e);
    }
  }

  // If window is backgrounded or minimized, update title
  if (document.hidden) {
    updateTabTitleBadge(title, body);
  }

  if (!("Notification" in window)) {
    return false;
  }

  // If permission has not been requested yet, request it!
  if (Notification.permission === "default") {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        return false;
      }
    } catch {
      return false;
    }
  }

  // Check if system notification permission is granted
  if (Notification.permission !== "granted") {
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
