// Pure JS time formatting helpers without external dependencies

export function fDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function fDateTime(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function fTimestamp(date) {
  if (!date) return "";
  return new Date(date).getTime();
}

export function fDateTimeSuffix(date) {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
}

export function fToNow(date) {
  if (!date) return "";
  const diffMs = Date.now() - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return fDate(date);
}

// WhatsApp-style message time inside bubble: "10:45 PM"
export function fMessageTime(date) {
  if (!date) return "";
  if (typeof date === "string") {
    if (date.includes("AM") || date.includes("PM")) {
      return date;
    }
    if (/^\d{1,2}:\d{2}$/.test(date.trim())) {
      const [h, m] = date.trim().split(":");
      let hours = parseInt(h, 10);
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${m} ${ampm}`;
    }
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

// WhatsApp-style day separator chip between messages: "TODAY", "YESTERDAY", "Wednesday", or full date
export function fMessageDayDivider(date) {
  if (!date) return "TODAY";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "TODAY";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffDays = Math.round((today - targetDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "YESTERDAY";
  if (diffDays > 1 && diffDays < 7) {
    return d.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  }

  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).toUpperCase();
}

// WhatsApp-style conversation list card time: "10:45 PM", "Yesterday", "Wed", or "24/09/26"
export function fChatListTime(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffDays = Math.round((today - targetDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return fMessageTime(d);
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays > 1 && diffDays < 7) {
    return d.toLocaleDateString("en-US", { weekday: "short" });
  }

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

