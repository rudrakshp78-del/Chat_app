import React from "react";
import {
  Globe,
  InstagramLogo,
  GithubLogo,
  LinkedinLogo,
  TwitterLogo,
  YoutubeLogo,
} from "phosphor-react";

/**
 * 12 Curated DiceBear Avataaars presets with distinct styles
 */
export const PRESET_AVATARS = [
  { name: "Felix", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" },
  { name: "Aneka", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka" },
  { name: "Mia", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia" },
  { name: "Oliver", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver" },
  { name: "Sophia", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia" },
  { name: "Leo", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo" },
  { name: "Jack", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack" },
  { name: "Zoe", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe" },
  { name: "Alex", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" },
  { name: "Bella", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bella" },
  { name: "Ethan", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan" },
  { name: "Chloe", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chloe" },
];

/**
 * Platform presets for quick addition
 */
export const PLATFORM_PRESETS = [
  { platform: "instagram", name: "Instagram", prefix: "https://instagram.com/" },
  { platform: "github", name: "GitHub", prefix: "https://github.com/" },
  { platform: "linkedin", name: "LinkedIn", prefix: "https://linkedin.com/in/" },
  { platform: "twitter", name: "Twitter / X", prefix: "https://x.com/" },
  { platform: "youtube", name: "YouTube", prefix: "https://youtube.com/@" },
  { platform: "website", name: "Website", prefix: "https://" },
];

/**
 * Auto-detect platform from URL or title
 */
export const getPlatformInfo = (url = "", title = "") => {
  const lowerUrl = (url || "").toLowerCase();
  const lowerTitle = (title || "").toLowerCase();

  if (lowerUrl.includes("instagram.com") || lowerTitle.includes("instagram")) {
    return { name: "Instagram", color: "#E1306C", icon: "instagram" };
  }
  if (lowerUrl.includes("github.com") || lowerTitle.includes("github")) {
    return { name: "GitHub", color: "#24292F", icon: "github" };
  }
  if (lowerUrl.includes("linkedin.com") || lowerTitle.includes("linkedin")) {
    return { name: "LinkedIn", color: "#0A66C2", icon: "linkedin" };
  }
  if (
    lowerUrl.includes("twitter.com") ||
    lowerUrl.includes("x.com") ||
    lowerTitle.includes("twitter") ||
    lowerTitle.includes(" x")
  ) {
    return { name: "Twitter / X", color: "#1DA1F2", icon: "twitter" };
  }
  if (
    lowerUrl.includes("youtube.com") ||
    lowerUrl.includes("youtu.be") ||
    lowerTitle.includes("youtube")
  ) {
    return { name: "YouTube", color: "#FF0000", icon: "youtube" };
  }
  return { name: "Website", color: "#00A884", icon: "globe" };
};

/**
 * Render platform icon with appropriate branding
 */
export const renderPlatformIcon = (platformIcon, size = 20) => {
  switch (platformIcon) {
    case "instagram":
      return <InstagramLogo size={size} color="#E1306C" weight="fill" />;
    case "github":
      return <GithubLogo size={size} weight="fill" />;
    case "linkedin":
      return <LinkedinLogo size={size} color="#0A66C2" weight="fill" />;
    case "twitter":
      return <TwitterLogo size={size} color="#1DA1F2" weight="fill" />;
    case "youtube":
      return <YoutubeLogo size={size} color="#FF0000" weight="fill" />;
    default:
      return <Globe size={size} color="#00A884" weight="bold" />;
  }
};

/**
 * High-performance client-side image compression to base64 Data URL.
 * Keeps file size small (~20-50KB) so MongoDB updates are instant and reliable.
 */
export const compressImage = (file, maxWidth = 400, maxHeight = 400, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
