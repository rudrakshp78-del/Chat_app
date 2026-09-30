/**
 * Mute Notifications Utility
 * Manages muted conversations per WhatsApp specifications:
 * - 8 Hours
 * - 1 Week
 * - Always
 */

const STORAGE_KEY = "muted_conversations";

const getMutedStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const setMutedStorage = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const isConversationMuted = (conversationId) => {
  if (!conversationId) return false;
  const mutedMap = getMutedStorage();
  const entry = mutedMap[conversationId.toString()];
  if (!entry) return false;

  if (entry.mutedUntil === "always") {
    return true;
  }

  if (typeof entry.mutedUntil === "number") {
    if (Date.now() < entry.mutedUntil) {
      return true;
    } else {
      // Expired, clean up
      delete mutedMap[conversationId.toString()];
      setMutedStorage(mutedMap);
      return false;
    }
  }

  return false;
};

export const muteConversation = (conversationId, duration = "always") => {
  if (!conversationId) return;
  const mutedMap = getMutedStorage();

  let mutedUntil = "always";
  let label = "Always";

  if (duration === "8_hours") {
    mutedUntil = Date.now() + 8 * 60 * 60 * 1000;
    label = "8 Hours";
  } else if (duration === "1_week") {
    mutedUntil = Date.now() + 7 * 24 * 60 * 60 * 1000;
    label = "1 Week";
  }

  mutedMap[conversationId.toString()] = {
    mutedUntil,
    duration,
    label,
    mutedAt: Date.now(),
  };

  setMutedStorage(mutedMap);
  window.dispatchEvent(
    new CustomEvent("conversation_mute_changed", {
      detail: { conversation_id: conversationId.toString(), isMuted: true },
    })
  );
};

export const unmuteConversation = (conversationId) => {
  if (!conversationId) return;
  const mutedMap = getMutedStorage();
  delete mutedMap[conversationId.toString()];
  setMutedStorage(mutedMap);

  window.dispatchEvent(
    new CustomEvent("conversation_mute_changed", {
      detail: { conversation_id: conversationId.toString(), isMuted: false },
    })
  );
};
