// Helpers for Chat Retention (After Viewing, 24 Hours, Permanently), Privacy & Manage Friendship

const RETENTION_STORAGE_KEY = "trackon_chat_retention";
const NICKNAME_STORAGE_KEY = "trackon_friend_nicknames";
const PINNED_FRIENDS_KEY = "trackon_pinned_friends";
const BLOCKED_CONTACTS_KEY = "trackon_blocked_contacts";
const PRIVACY_STORAGE_KEY = "Trackon_privacy_settings";

export const DEFAULT_PRIVACY_SETTINGS = {
  lastSeen: "Everyone",
  online: "Everyone",
  profilePhoto: "Everyone",
  about: "Everyone",
  readReceipts: true,
  disappearingTimer: "Off",
  groups: "Everyone",
  screenSecurity: true,
  blockedContacts: [],
};

export const RETENTION_MODES = [
  {
    id: "after_viewing",
    title: "After Viewing",
    label: "After Viewing",
    subtitle: "Messages disappear automatically once you view and leave the chat",
    shortLabel: "After Viewing",
    badge: "👁️ After Viewing",
  },
  {
    id: "24_hours",
    title: "24 Hours after Viewing",
    label: "24 Hours after Viewing",
    subtitle: "Messages are kept for 24 hours and then automatically cleared",
    shortLabel: "24 Hours",
    badge: "🕒 24 Hours",
  },
  {
    id: "permanent",
    title: "Permanently (Keep Chats)",
    label: "Permanently (Keep Chats)",
    subtitle: "Messages are saved permanently in this chat unless deleted",
    shortLabel: "Permanently",
    badge: "♾️ Permanently",
  },
];

export function getPrivacySettings() {
  try {
    const saved = localStorage.getItem(PRIVACY_STORAGE_KEY);
    return saved
      ? { ...DEFAULT_PRIVACY_SETTINGS, ...JSON.parse(saved) }
      : DEFAULT_PRIVACY_SETTINGS;
  } catch {
    return DEFAULT_PRIVACY_SETTINGS;
  }
}

export function savePrivacySettings(nextSettings) {
  try {
    const merged = { ...getPrivacySettings(), ...nextSettings };
    localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(
      new CustomEvent("privacy_settings_changed", { detail: merged })
    );
    return merged;
  } catch (e) {
    console.error(e);
    return nextSettings;
  }
}

export function areReadReceiptsEnabled() {
  const settings = getPrivacySettings();
  return settings.readReceipts !== false;
}

export function getChatRetentionMode(conversationId) {
  try {
    if (conversationId) {
      const map = JSON.parse(localStorage.getItem(RETENTION_STORAGE_KEY) || "{}");
      if (map[String(conversationId)]) {
        return map[String(conversationId)];
      }
    }
    // Fall back to global Default Message Timer in Privacy Settings
    const privacy = getPrivacySettings();
    if (privacy.disappearingTimer === "After Viewing") return "after_viewing";
    if (privacy.disappearingTimer === "24 Hours") return "24_hours";
    return "permanent";
  } catch {
    return "permanent";
  }
}

export function setChatRetentionMode(conversationId, mode) {
  if (!conversationId) return;
  try {
    const map = JSON.parse(localStorage.getItem(RETENTION_STORAGE_KEY) || "{}");
    map[String(conversationId)] = mode;
    localStorage.setItem(RETENTION_STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(
      new CustomEvent("chat_retention_changed", {
        detail: { conversation_id: String(conversationId), mode },
      })
    );
  } catch (e) {
    console.error(e);
  }
}

export function getRetentionInfo(mode) {
  return (
    RETENTION_MODES.find((m) => m.id === mode) ||
    RETENTION_MODES[RETENTION_MODES.length - 1]
  );
}

// Custom Friend Nicknames
export function getFriendNickname(conversationId) {
  if (!conversationId) return "";
  try {
    const map = JSON.parse(localStorage.getItem(NICKNAME_STORAGE_KEY) || "{}");
    return map[String(conversationId)] || "";
  } catch {
    return "";
  }
}

export function setFriendNickname(conversationId, nickname) {
  if (!conversationId) return;
  try {
    const map = JSON.parse(localStorage.getItem(NICKNAME_STORAGE_KEY) || "{}");
    const trimmed = (nickname || "").trim();
    if (trimmed) {
      map[String(conversationId)] = trimmed;
    } else {
      delete map[String(conversationId)];
    }
    localStorage.setItem(NICKNAME_STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(
      new CustomEvent("friendship_updated", {
        detail: { conversation_id: String(conversationId) },
      })
    );
  } catch (e) {
    console.error(e);
  }
}

// Best Friend / Pinned Chat
export function isFriendPinned(conversationId) {
  if (!conversationId) return false;
  try {
    const list = JSON.parse(localStorage.getItem(PINNED_FRIENDS_KEY) || "[]");
    return list.includes(String(conversationId));
  } catch {
    return false;
  }
}

export function toggleFriendPinned(conversationId) {
  if (!conversationId) return false;
  try {
    const list = JSON.parse(localStorage.getItem(PINNED_FRIENDS_KEY) || "[]");
    const key = String(conversationId);
    let next;
    let isNowPinned;
    if (list.includes(key)) {
      next = list.filter((item) => item !== key);
      isNowPinned = false;
    } else {
      next = Array.from(new Set([...list, key]));
      isNowPinned = true;
    }
    localStorage.setItem(PINNED_FRIENDS_KEY, JSON.stringify(next));
    window.dispatchEvent(
      new CustomEvent("friendship_updated", {
        detail: { conversation_id: key, pinned: isNowPinned },
      })
    );
    return isNowPinned;
  } catch {
    return false;
  }
}

// Block / Unblock Contact (synced across Contact.js, ManageFriendshipDialog, and PrivacyDialog)
export function getBlockedContactsList() {
  try {
    const raw = JSON.parse(localStorage.getItem(BLOCKED_CONTACTS_KEY) || "[]");
    return Array.isArray(raw) ? raw.map(String) : [];
  } catch {
    return [];
  }
}

export function isPersonBlocked(conversationId) {
  if (!conversationId) return false;
  const list = getBlockedContactsList();
  return list.includes(String(conversationId));
}

export function togglePersonBlocked(conversationId, personName) {
  if (!conversationId) return false;
  try {
    const list = getBlockedContactsList();
    const key = String(conversationId);
    let next;
    let nowBlocked;
    if (list.includes(key)) {
      next = list.filter((item) => item !== key);
      nowBlocked = false;
    } else {
      next = Array.from(new Set([...list, key]));
      nowBlocked = true;
    }
    localStorage.setItem(BLOCKED_CONTACTS_KEY, JSON.stringify(next));

    // Also keep Privacy Settings blockedContacts in sync
    const privacy = getPrivacySettings();
    const label = personName ? `${personName} (${key})` : key;
    let nextPrivacyBlocked = Array.isArray(privacy.blockedContacts)
      ? [...privacy.blockedContacts]
      : [];
    if (nowBlocked) {
      if (!nextPrivacyBlocked.some((c) => c === key || c.includes(key))) {
        nextPrivacyBlocked.push(label);
      }
    } else {
      nextPrivacyBlocked = nextPrivacyBlocked.filter(
        (c) => c !== key && !c.includes(`(${key})`) && c !== personName
      );
    }
    savePrivacySettings({ blockedContacts: nextPrivacyBlocked });

    window.dispatchEvent(
      new CustomEvent("friendship_updated", {
        detail: { conversation_id: key, blocked: nowBlocked },
      })
    );
    return nowBlocked;
  } catch {
    return false;
  }
}

