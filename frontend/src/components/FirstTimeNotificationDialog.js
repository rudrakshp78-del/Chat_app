import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Box,
  Slide,
  useTheme,
  alpha,
  IconButton,
} from "@mui/material";
import {
  BellRinging,
  SpeakerHigh,
  ChatCircleDots,
  X,
  CheckCircle,
} from "phosphor-react";
import {
  getNotificationPermission,
  requestNotificationPermission,
  playNotificationSong,
  showOutsideNotification,
} from "../utils/notification";
import { useDispatch } from "react-redux";
import { showSnackbar } from "../redux/slices/app";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function FirstTimeNotificationDialog() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const alreadyDecided =
      window.localStorage.getItem("notification_prompt_decided") === "true";
    const justRegistered =
      window.localStorage.getItem("first_time_signup") === "true";
    const permission = getNotificationPermission();

    // Show if:
    // 1) User just registered their account for the first time, OR
    // 2) The user hasn't made a decision yet and permission is not granted
    if ((justRegistered || !alreadyDecided) && permission !== "granted") {
      const timer = setTimeout(() => {
        setOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAllow = async () => {
    try {
      window.localStorage.setItem("notification_prompt_decided", "true");
      window.localStorage.removeItem("first_time_signup");
      window.localStorage.setItem("chat_sound_enabled", "true");

      // Request system permissions (native Android + Web)
      await requestNotificationPermission();

      // Play pleasant notification musical chime song
      playNotificationSong();

      // Send initial test confirmation notification to notification bar
      showOutsideNotification({
        title: "Trackon 🔔🎵",
        body: "Notifications and sound alerts are enabled! You will now receive alerts on your notification bar.",
      });

      dispatch(
        showSnackbar({
          severity: "success",
          message: "Notification bar alerts and sound enabled!",
        })
      );
    } catch (e) {
      console.error("handleAllow error:", e);
    } finally {
      setOpen(false);
    }
  };

  const handleDismiss = () => {
    window.localStorage.setItem("notification_prompt_decided", "true");
    window.localStorage.removeItem("first_time_signup");
    setOpen(false);
  };

  if (!open) return null;

  const isLight = theme.palette.mode === "light";

  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={handleDismiss}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          p: { xs: 2.5, sm: 3 },
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.28)",
          background: isLight
            ? "linear-gradient(180deg, #FFFFFF 0%, #F8FAFF 100%)"
            : "linear-gradient(180deg, #212B36 0%, #161C24 100%)",
        },
      }}
    >
      {/* Top Close Button */}
      <IconButton
        onClick={handleDismiss}
        sx={{
          position: "absolute",
          top: 14,
          right: 14,
          color: "text.secondary",
          bgcolor: (t) => alpha(t.palette.text.primary, 0.05),
          "&:hover": {
            bgcolor: (t) => alpha(t.palette.text.primary, 0.12),
          },
        }}
        size="small"
      >
        <X size={18} />
      </IconButton>

      <DialogContent sx={{ p: 0, pt: 1, textAlign: "center" }}>
        {/* Animated Bell with Pulsing Ring & Musical Soundwaves */}
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            mx: "auto",
            mb: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #00A884 100%)`,
            color: "#ffffff",
            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
            position: "relative",
            animation: "pulseRing 2.2s infinite ease-in-out",
            "@keyframes pulseRing": {
              "0%": {
                boxShadow: `0 0 0 0 ${alpha(theme.palette.primary.main, 0.45)}`,
              },
              "70%": {
                boxShadow: `0 0 0 16px ${alpha(theme.palette.primary.main, 0)}`,
              },
              "100%": {
                boxShadow: `0 0 0 0 ${alpha(theme.palette.primary.main, 0)}`,
              },
            },
          }}
        >
          <BellRinging size={36} weight="fill" />
        </Box>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            letterSpacing: "-0.5px",
            mb: 1,
            color: "text.primary",
          }}
        >
          Turn on Notifications
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.5, mb: 3, px: 1 }}
        >
          Never miss a message! Allow notifications to receive instant alerts on your
          notification bar with pleasant sound when friends text or call.
        </Typography>

        {/* Feature List */}
        <Stack spacing={1.5} sx={{ textAlign: "left", mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 36,
                height: 36,
                minWidth: 36,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChatCircleDots size={20} weight="duotone" />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>
                Notification Bar Alerts
              </Typography>
              <Typography variant="caption" color="text.secondary">
                See incoming messages right in your system status bar.
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 36,
                height: 36,
                minWidth: 36,
                borderRadius: 2,
                bgcolor: alpha("#00A884", 0.12),
                color: "#00A884",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SpeakerHigh size={20} weight="duotone" />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>
                Melodic Chime on Message
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Plays a pleasant musical chime tone on incoming notifications.
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 36,
                height: 36,
                minWidth: 36,
                borderRadius: 2,
                bgcolor: alpha("#7635dc", 0.12),
                color: "#7635dc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle size={20} weight="duotone" />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>
                Always in Control
              </Typography>
              <Typography variant="caption" color="text.secondary">
                You can change sounds or mute chats anytime in Settings.
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 0, flexDirection: "column", gap: 1 }}>
        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={<BellRinging size={20} weight="bold" />}
          onClick={handleAllow}
          sx={{
            py: 1.4,
            borderRadius: 2.5,
            fontWeight: 700,
            fontSize: "0.95rem",
            textTransform: "none",
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #00A884 100%)`,
            boxShadow: `0 6px 18px ${alpha(theme.palette.primary.main, 0.35)}`,
            "&:hover": {
              background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, #008f6f 100%)`,
            },
          }}
        >
          Allow Notifications
        </Button>

        <Button
          fullWidth
          variant="text"
          size="medium"
          onClick={handleDismiss}
          sx={{
            color: "text.secondary",
            textTransform: "none",
            fontWeight: 600,
            "&:hover": {
              bgcolor: (t) => alpha(t.palette.text.primary, 0.05),
            },
          }}
        >
          Maybe Later
        </Button>
      </DialogActions>
    </Dialog>
  );
}