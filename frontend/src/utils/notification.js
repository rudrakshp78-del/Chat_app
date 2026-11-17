// WhatsApp-style Desktop & System Notification Manager
import { NOTIFICATION_CHIME_DATA_URI } from "./notificationSound";

export { NOTIFICATION_CHIME_DATA_URI };

let swRegistration = null;
let originalDocumentTitle =
  typeof document !== "undefined" ? document.title || "Chat App" : "Chat App";
let unreadCount = 0;
let titleInterval = null;

let sharedAudioContext = null;
let sharedAudioElement = null;
let audioUnlocked = false;

// 1. Get or create singleton Web AudioContext
const getSharedAudioContext = () => {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioContext) {
    try {
      sharedAudioContext = new AudioCtx();
    } catch {
      return null;
    }
  }
  return sharedAudioContext;
};

// 2. Auto-unlock AudioContext & HTML5 Audio on user gesture
export const unlockAudio = () => {
  if (typeof window === "undefined") return;

  // 1. Resume AudioContext
  try {
    const ctx = getSharedAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx
        .resume()
        .then(() => {
          audioUnlocked = true;
        })
        .catch(() => {});
    } else if (ctx && ctx.state === "running") {
      audioUnlocked = true;
    }
  } catch (e) {}

  // 2. Pre-warm HTML5 Audio
  try {
    if (!sharedAudioElement) {
      sharedAudioElement = new Audio(NOTIFICATION_CHIME_DATA_URI);
      sharedAudioElement.preload = "auto";
    }
    sharedAudioElement.volume = 0.01;
    const playPromise = sharedAudioElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          sharedAudioElement.pause();
          sharedAudioElement.currentTime = 0;
          sharedAudioElement.volume = 1.0;
          audioUnlocked = true;
        })
        .catch(() => {});
    }
  } catch (e) {}
};

// Listen globally on window for user gestures to unlock audio
if (typeof window !== "undefined") {
  const unlockEvents = [
    "click",
    "touchstart",
    "touchend",
    "pointerdown",
    "keydown",
  ];
  const handleUserGesture = () => {
    unlockAudio();
    if (audioUnlocked) {
      unlockEvents.forEach((evt) =>
        window.removeEventListener(evt, handleUserGesture)
      );
    }
  };
  unlockEvents.forEach((evt) =>
    window.addEventListener(evt, handleUserGesture, { passive: true })
  );
}

// 3. Initialize Service Worker for persistent outside/background notifications
export const initServiceWorker = async () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js");
    console.log(
      "✅ Notification Service Worker registered:",
      swRegistration.scope
    );
    return swRegistration;
  } catch (err) {
    console.log("Service Worker registration notice:", err.message);
    return null;
  }
};

// 4. Check current notification permission (both Android native & Web)
export const getNotificationPermission = () => {
  if (typeof window === "undefined") return "unsupported";

  // Check Android Native bridge first
  if (window.AndroidNotificationBridge) {
    try {
      if (
        typeof window.AndroidNotificationBridge.hasPermission === "function"
      ) {
        return window.AndroidNotificationBridge.hasPermission()
          ? "granted"
          : "default";
      }
      return "granted";
    } catch {
      // fallback
    }
  }

  // Web Notification API
  if ("Notification" in window) {
    return Notification.permission; // 'granted', 'denied', or 'default'
  }

  return "unsupported";
};

// 5. Pure Web Audio crystal chime synthesis (E5 659Hz -> B5 988Hz chime)
export const playNotificationChimeSynthesizer = () => {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return false;

    const playNotes = () => {
      try {
        const now = ctx.currentTime;
        const melody = [
          { freq: 659.25, time: 0.0, dur: 0.22, gain: 0.28 },
          { freq: 987.77, time: 0.08, dur: 0.35, gain: 0.35 },
        ];

        melody.forEach((note) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(note.freq, now + note.time);
          gain.gain.setValueAtTime(note.gain, now + note.time);
          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            now + note.time + note.dur
          );
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + note.time);
          osc.stop(now + note.time + note.dur);

          // Harmonic overtone for shimmering crystal tone
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(note.freq * 2, now + note.time);
          gain2.gain.setValueAtTime(note.gain * 0.2, now + note.time);
          gain2.gain.exponentialRampToValueAtTime(
            0.0001,
            now + note.time + note.dur
          );
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(now + note.time);
          osc2.stop(now + note.time + note.dur);
        });
        return true;
      } catch {
        return false;
      }
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(playNotes).catch(() => {});
      return false;
    }

    return playNotes();
  } catch {
    return false;
  }
};

// 6. Play melodic notification chime sound
export const playNotificationSong = () => {
  if (typeof window === "undefined") return;

  // Check if sound is disabled in settings
  const soundEnabled = window.localStorage.getItem("chat_sound_enabled");
  if (soundEnabled === "false") return;

  // 1. If running inside Android native app, play system notification chime directly
  if (window.AndroidNotificationBridge?.playNotificationSound) {
    try {
      window.AndroidNotificationBridge.playNotificationSound();
    } catch (e) {
      console.warn("Android native sound note:", e);
    }
  }

  // 2. Play Web Audio crystal chime (instant, zero decode delay)
  const webAudioPlayed = playNotificationChimeSynthesizer();

  // 3. Play HTML5 Audio as companion / fallback if Web Audio is suspended
  if (!webAudioPlayed) {
    try {
      const audio = sharedAudioElement || new Audio(NOTIFICATION_CHIME_DATA_URI);
      audio.volume = 1.0;
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          try {
            const fallbackAudio = new Audio("/notification.wav");
            fallbackAudio.volume = 1.0;
            fallbackAudio.play().catch(() => {});
          } catch {}
        });
      }
    } catch (e) {}
  }
};

// Aliased for full backwards compatibility
export const playNotificationChime = playNotificationSong;

// 7. Request permission explicitly via User Gesture
export const requestNotificationPermission = async () => {
  if (typeof window === "undefined") return false;

  // Unlock audio during user interaction
  unlockAudio();

  // 1. Native Android runtime permission for Android 13+ (API 33+)
  if (window.AndroidNotificationBridge) {
    try {
      if (
        typeof window.AndroidNotificationBridge.requestPermission === "function"
      ) {
        window.AndroidNotificationBridge.requestPermission();
      }
      if (
        typeof window.AndroidNotificationBridge.hasPermission === "function"
      ) {
        const granted = window.AndroidNotificationBridge.hasPermission();
        if (granted) {
          playNotificationSong();
          return true;
        }
      }
    } catch (e) {
      console.warn("Android native permission request note:", e);
    }
  }

  // 2. Web Notification permission
  if ("Notification" in window) {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        playNotificationSong();
        return true;
      }
      return permission === "granted";
    } catch (err) {
      console.error("requestNotificationPermission error:", err);
    }
  }

  return false;
};

// Open system app notification settings (Android)
export const openNotificationSettings = () => {
  if (
    typeof window !== "undefined" &&
    window.AndroidNotificationBridge?.openNotificationSettings
  ) {
    try {
      window.AndroidNotificationBridge.openNotificationSettings();
      return true;
    } catch (e) {
      console.warn("openNotificationSettings error:", e);
    }
  }
  return false;
};

// 8. Update browser tab title badge when minimized / in background
export const updateTabTitleBadge = (senderName, messageText) => {
  if (typeof document === "undefined") return;

  unreadCount += 1;
  const badgeTitle = `(${unreadCount}) ${senderName}: ${(messageText || "").slice(0, 20)}`;

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

// 9. Show Outside / Desktop Notification (Windows Action Center, Mac, Android)
export const showOutsideNotification = async ({
  title,
  body,
  icon,
  conversation_id,
  unreadCount = 1,
  totalBadgeCount = 1,
  playSound = true,
  onClick,
}) => {
  if (typeof window === "undefined") {
    return false;
  }

  const numUnread = Math.max(1, Number(unreadCount) || 1);
  const numBadge = Math.max(numUnread, Number(totalBadgeCount) || numUnread);

  // Play notification chime and haptic feedback if enabled
  if (playSound) {
    playNotificationChime();
  }
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate([80, 40, 80]);
    } catch {
      // ignore
    }
  }

  // 1. Post to native Android system notification bar if running inside Android app
  if (typeof window !== "undefined" && window.AndroidNotificationBridge) {
    try {
      if (window.AndroidNotificationBridge.showNotificationWithBadge) {
        window.AndroidNotificationBridge.showNotificationWithBadge(
          title || "Trackon",
          body || "New message received",
          conversation_id ? String(conversation_id) : "",
          numUnread,
          numBadge
        );
        return true;
      } else if (window.AndroidNotificationBridge.showNotification) {
        window.AndroidNotificationBridge.showNotification(
          title || "Trackon",
          body || "New message received",
          conversation_id ? String(conversation_id) : ""
        );
        return true;
      }
    } catch (e) {
      console.warn("Android native notification post error:", e);
    }
  }

  // Update app icon launcher badge
  updateAppBadge(numBadge);

  // If window is backgrounded or minimized, update title
  if (typeof document !== "undefined" && document.hidden) {
    updateTabTitleBadge(title, body);
  }

  if (!("Notification" in window)) {
    return false;
  }

  // Check if system notification permission is granted
  if (Notification.permission !== "granted") {
    return false;
  }

  // Choose a clean fallback icon for Windows / system trays
  const notificationIcon =
    icon && !icon.includes("api.dicebear.com") ? icon : "/logo192.png";

  const displayTitle =
    numUnread > 1 ? `(${numUnread}) ${title || "Trackon"}` : title || "Trackon";
  const displayBody =
    numUnread > 1 && !(body || "").includes("messages")
      ? `${body} (${numUnread} new messages)`
      : body || "New message received";

  const options = {
    body: displayBody,
    icon: notificationIcon,
    badge: "/logo192.png",
    tag: conversation_id ? `chat_${conversation_id}` : "chat_msg",
    renotify: true,
    silent: false, // let system sound / chime play
    data: {
      conversation_id,
      url: "/app",
    },
  };

  // 1) Try via ServiceWorkerRegistration with a 350ms race timeout so it NEVER hangs
  let swSucceeded = false;
  try {
    let reg = swRegistration;
    if (!reg && "serviceWorker" in navigator) {
      reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((resolve) => setTimeout(() => resolve(null), 350)),
      ]);
    }
    if (reg && typeof reg.showNotification === "function") {
      await reg.showNotification(displayTitle, options);
      swSucceeded = true;
    }
  } catch (err) {
    console.warn("ServiceWorker showNotification note:", err.message);
  }

  if (swSucceeded) {
    return true;
  }

  // 2) Fallback to window.Notification
  try {
    const notification = new Notification(displayTitle, options);

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
      const simpleNotification = new Notification(title || "Trackon", {
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

// 10. Update Home Screen App Logo Launcher Badge Count
export const updateAppBadge = async (count) => {
  const badgeCount = Math.max(0, Number(count) || 0);

  // 1. Android Native Launcher Badge (Samsung, Xiaomi, Oppo, Vivo, OnePlus, Huawei, etc.)
  if (typeof window !== "undefined" && window.AndroidNotificationBridge) {
    try {
      if (badgeCount > 0 && window.AndroidNotificationBridge.setBadgeCount) {
        window.AndroidNotificationBridge.setBadgeCount(badgeCount);
      } else if (window.AndroidNotificationBridge.clearBadge) {
        window.AndroidNotificationBridge.clearBadge();
      }
    } catch (e) {
      console.warn("Android native badge update note:", e);
    }
  }

  // 2. Web & PWA App Badging API (Chrome, Edge, Android WebAPK launcher icon)
  if (typeof navigator !== "undefined") {
    try {
      if (badgeCount > 0 && "setAppBadge" in navigator) {
        await navigator.setAppBadge(badgeCount);
      } else if ("clearAppBadge" in navigator) {
        await navigator.clearAppBadge();
      }
    } catch (e) {
      // ignore
    }
  }
};

// Aliased helper to explicitly clear home screen app icon badge
export const clearAppBadge = () => updateAppBadge(0);

// 11. Clear specific conversation notification from tray when opened
export const clearConversationNotification = (conversationId) => {
  if (
    typeof window !== "undefined" &&
    window.AndroidNotificationBridge?.clearConversationNotification
  ) {
    try {
      if (conversationId) {
        window.AndroidNotificationBridge.clearConversationNotification(
          String(conversationId)
        );
      }
    } catch (e) {}
  }
};

// 12. Incoming Call Ringtone synthesizer & manager
let callRingtoneInterval = null;
let activeCallOscillators = [];

export const playIncomingCallRingtone = () => {
  if (typeof window === "undefined") return;
  stopIncomingCallRingtone();

  // If on native Android, MainActivity already plays the system ringtone.
  // Synthesize dual-tone telephone ring for Webview / Web:
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const ring = () => {
      try {
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(480, ctx.currentTime);

        gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 1.8);
        osc2.stop(ctx.currentTime + 1.8);

        activeCallOscillators.push(osc1, osc2);
      } catch (e) {}
    };

    ring();
    callRingtoneInterval = setInterval(ring, 3000);
  } catch (e) {}
};

export const stopIncomingCallRingtone = () => {
  if (callRingtoneInterval) {
    clearInterval(callRingtoneInterval);
    callRingtoneInterval = null;
  }
  activeCallOscillators.forEach((osc) => {
    try {
      osc.stop();
      osc.disconnect();
    } catch (e) {}
  });
  activeCallOscillators = [];

  // Also dismiss native call notification if active
  if (typeof window !== "undefined" && window.AndroidNotificationBridge?.dismissIncomingCall) {
    try {
      window.AndroidNotificationBridge.dismissIncomingCall();
    } catch (e) {}
  }
};
