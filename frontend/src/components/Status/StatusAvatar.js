import React from "react";
import { Avatar, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import getAvatarUrl from "../../utils/getAvatarUrl";

/**
 * StatusAvatar - Renders a WhatsApp-style avatar with segmented status ring.
 *
 * @param {string} src - Avatar image source
 * @param {string} name - User's name (for fallback avatar)
 * @param {number} size - Avatar diameter in pixels (default 48)
 * @param {number} count - Total number of active statuses
 * @param {boolean} allViewed - True if all statuses have been viewed
 * @param {boolean} isOwn - True if this is the current user's avatar
 * @param {boolean} showAddIcon - Whether to show the "+" badge when own status
 * @param {Function} onClick - Click callback
 */
const StatusAvatar = ({
  src,
  name,
  size = 48,
  count = 0,
  allViewed = false,
  isOwn = false,
  showAddIcon = false,
  onClick,
}) => {
  const theme = useTheme();

  // Avatar diameter inside the ring
  const strokeWidth = 2.5;
  const padding = 3;
  const totalSize = size + (strokeWidth + padding) * 2;
  const radius = (totalSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Segment colors: Green for unviewed, Muted Gray for viewed
  const ringColor = allViewed
    ? theme.palette.mode === "light"
      ? "#B0B3B8"
      : "#65676B"
    : "#25D366"; // WhatsApp signature active status green

  // Calculate segment lengths and gaps for multiple statuses
  let strokeDasharray = "none";
  let strokeDashoffset = "0";

  if (count === 1) {
    strokeDasharray = `${circumference}`;
  } else if (count > 1) {
    const gap = Math.min(6, circumference / (count * 4));
    const segmentLength = (circumference - count * gap) / count;
    strokeDasharray = `${segmentLength} ${gap}`;
    // Start at top (-90 degrees)
    strokeDashoffset = `${gap / 2}`;
  }

  const avatarSrc = getAvatarUrl(src, name);

  return (
    <Box
      onClick={onClick}
      sx={{
        position: "relative",
        width: totalSize,
        height: totalSize,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: onClick ? "pointer" : "default",
        flexShrink: 0,
        userSelect: "none",
        "&:hover": onClick
          ? {
              transform: "scale(1.03)",
              transition: "transform 0.15s ease",
            }
          : {},
      }}
    >
      {/* Segmented Ring SVG (shown if status count > 0) */}
      {count > 0 && (
        <svg
          width={totalSize}
          height={totalSize}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transform: "rotate(-90deg)",
            pointerEvents: "none",
          }}
        >
          <circle
            cx={totalSize / 2}
            cy={totalSize / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* Avatar Image */}
      <Avatar
        src={avatarSrc}
        alt={name || "User"}
        sx={{
          width: size,
          height: size,
          border:
            count === 0 && !showAddIcon
              ? `1px solid ${theme.palette.divider}`
              : "none",
        }}
      />

      {/* WhatsApp "+" icon badge for adding own status when none exists */}
      {showAddIcon && (
        <Box
          sx={{
            position: "absolute",
            bottom: 2,
            right: 2,
            width: Math.max(18, Math.round(size * 0.36)),
            height: Math.max(18, Math.round(size * 0.36)),
            borderRadius: "50%",
            backgroundColor: "#25D366",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: Math.max(13, Math.round(size * 0.28)),
            fontWeight: "bold",
            border: `2px solid ${theme.palette.background.paper}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        >
          +
        </Box>
      )}
    </Box>
  );
};

export default StatusAvatar;
