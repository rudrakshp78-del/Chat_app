import React, { useState, useEffect } from "react";
import { Box, Stack, Typography, IconButton, Collapse } from "@mui/material";
import { BellRinging, X } from "phosphor-react";
import {
  getNotificationPermission,
  requestNotificationPermission,
} from "../utils/notification";

const NotificationBanner = () => {
  const [permission, setPermission] = useState(getNotificationPermission());
  const [dismissed, setDismissed] = useState(
    () => window.sessionStorage.getItem("dismiss_notif_banner") === "true"
  );
  const [showBlockedGuide, setShowBlockedGuide] = useState(false);

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  // If already granted or unsupported or dismissed, don't show
  if (permission === "granted" || permission === "unsupported" || dismissed) {
    return null;
  }

  const handleEnableClick = async () => {
    if (permission === "denied") {
      setShowBlockedGuide(true);
      return;
    }

    const granted = await requestNotificationPermission();
    if (granted) {
      setPermission("granted");
    } else {
      setPermission(getNotificationPermission());
      if (getNotificationPermission() === "denied") {
        setShowBlockedGuide(true);
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    window.sessionStorage.setItem("dismiss_notif_banner", "true");
  };

  return (
    <Box
      sx={{
        width: "100%",
        bgcolor: (theme) =>
          theme.palette.mode === "light" ? "#1877F2" : "#0d47a1",
        color: "#ffffff",
        p: 1.5,
        borderRadius: 1.5,
        mb: 1.5,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              minWidth: 38,
              borderRadius: "50%",
              bgcolor: "rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BellRinging size={22} color="#ffffff" weight="bold" />
          </Box>
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: "#fff", lineHeight: 1.2 }}>
              Get notified of new messages
            </Typography>
            <Typography
              variant="caption"
              onClick={handleEnableClick}
              sx={{
                color: "rgba(255, 255, 255, 0.9)",
                cursor: "pointer",
                textDecoration: "underline",
                fontWeight: 600,
                "&:hover": { color: "#ffffff" },
              }}
            >
              Turn on desktop notifications &gt;
            </Typography>
          </Stack>
        </Stack>

        <IconButton size="small" onClick={handleDismiss} sx={{ color: "rgba(255, 255, 255, 0.8)" }}>
          <X size={18} />
        </IconButton>
      </Stack>

      {/* Guide if notifications are blocked in browser settings */}
      <Collapse in={showBlockedGuide}>
        <Box
          sx={{
            mt: 1.5,
            pt: 1.5,
            borderTop: "1px solid rgba(255, 255, 255, 0.25)",
          }}
        >
          <Typography variant="caption" sx={{ color: "#fff", display: "block", mb: 1 }}>
            🔒 Notifications are currently blocked by your browser. To allow them:
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", display: "block", pl: 1 }}>
            1. Click the <strong>lock/tune icon (🔒)</strong> on the left side of your browser's address bar.
            <br />
            2. Toggle <strong>Notifications</strong> to <strong>Allow</strong>.
            <br />
            3. Refresh this page to receive alerts outside the chat!
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
};

export default NotificationBanner;
