import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Switch,
  IconButton,
  Divider,
  Box,
  Alert,
} from "@mui/material";
import { Bell, BellRinging, SpeakerHigh, X } from "phosphor-react";
import {
  getNotificationPermission,
  requestNotificationPermission,
  playNotificationChime,
  showOutsideNotification,
} from "../../../utils/notification";

const NotificationDialog = ({ open, handleClose }) => {
  const [permission, setPermission] = useState(getNotificationPermission());
  const [soundEnabled, setSoundEnabled] = useState(
    () => window.localStorage.getItem("chat_sound_enabled") !== "false"
  );
  const [testSent, setTestSent] = useState(false);

  const handleToggleSound = (e) => {
    const val = e.target.checked;
    setSoundEnabled(val);
    window.localStorage.setItem("chat_sound_enabled", val ? "true" : "false");
    if (val) {
      playNotificationChime();
    }
  };

  const handleEnablePermission = async () => {
    await requestNotificationPermission();
    setPermission(getNotificationPermission());
  };

  const handleSendTestNotification = async () => {
    setTestSent(true);
    await showOutsideNotification({
      title: "Chat App Notification",
      body: "Incoming message notifications outside the chat are working!",
      icon: "/logo192.png",
    });
    setTimeout(() => setTestSent(false), 3000);
  };

  const isGranted = permission === "granted";
  const isDenied = permission === "denied";

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Bell size={22} weight="bold" />
          <Typography variant="h6" fontWeight="bold">
            Notification Settings
          </Typography>
        </Stack>
        <IconButton size="small" onClick={handleClose}>
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 2.5 }}>
        <Stack spacing={2.5}>
          {/* Permission Status */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: isGranted
                ? "rgba(37, 211, 102, 0.1)"
                : isDenied
                ? "rgba(239, 68, 68, 0.1)"
                : "rgba(245, 158, 11, 0.1)",
              border: isGranted
                ? "1px solid rgba(37, 211, 102, 0.3)"
                : isDenied
                ? "1px solid rgba(239, 68, 68, 0.3)"
                : "1px solid rgba(245, 158, 11, 0.3)",
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack spacing={0.25}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Desktop & Outside Alerts
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {isGranted
                    ? "Allowed • You will receive alerts outside the chat"
                    : isDenied
                    ? "Blocked by browser settings"
                    : "Not yet enabled"}
                </Typography>
              </Stack>

              {!isGranted && !isDenied && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleEnablePermission}
                  sx={{
                    bgcolor: "#25D366",
                    "&:hover": { bgcolor: "#1ebd58" },
                    color: "#fff",
                    fontWeight: "bold",
                  }}
                >
                  Enable
                </Button>
              )}
            </Stack>

            {isDenied && (
              <Alert severity="warning" sx={{ mt: 1.5, py: 0.5, fontSize: "0.8rem" }}>
                Notifications are blocked. Click the lock icon (🔒) in your browser address bar to Allow.
              </Alert>
            )}
          </Box>

          {/* Sound Toggle */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <SpeakerHigh size={22} />
              <Stack spacing={0}>
                <Typography variant="subtitle2">Message Chime Sound</Typography>
                <Typography variant="caption" color="text.secondary">
                  Play WhatsApp tone when receiving messages
                </Typography>
              </Stack>
            </Stack>
            <Switch checked={soundEnabled} onChange={handleToggleSound} />
          </Stack>

          <Divider />

          {/* Test Notification Button */}
          <Stack spacing={1}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<BellRinging size={18} />}
              onClick={handleSendTestNotification}
              disabled={testSent}
            >
              {testSent ? "Test Notification Sent!" : "Send Test Notification"}
            </Button>
            <Typography variant="caption" color="text.secondary" textAlign="center">
              Click this button, then switch tabs or minimize to see the alert!
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} variant="contained" fullWidth>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationDialog;
