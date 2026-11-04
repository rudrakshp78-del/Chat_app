import React, { useEffect } from "react";
import {
  Avatar,
  Box,
  IconButton,
  Paper,
  Slide,
  Stack,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import { X } from "phosphor-react";
import getAvatarUrl from "../utils/getAvatarUrl";

const InAppNotification = ({ notification, onClose, onOpen }) => {
  const theme = useTheme();

  useEffect(() => {
    if (!notification) return undefined;
    const timer = setTimeout(() => {
      onClose();
    }, 5500);
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  const isLight = theme.palette.mode === "light";
  const avatarSrc = getAvatarUrl(notification.senderAvatar, notification.senderName);

  return (
    <Slide direction="down" in={Boolean(notification)} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: "fixed",
          top: { xs: "calc(8px + var(--safe-top, 0px))", sm: 16 },
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 99999,
          width: { xs: "calc(100% - 24px)", sm: 420 },
          maxWidth: 440,
          pointerEvents: "auto",
        }}
      >
        <Paper
          elevation={12}
          onClick={() => {
            if (notification.conversation_id) {
              onOpen(notification.conversation_id);
            }
            onClose();
          }}
          sx={{
            p: 1.5,
            borderRadius: 3,
            cursor: "pointer",
            bgcolor: isLight
              ? "rgba(255, 255, 255, 0.96)"
              : "rgba(24, 32, 47, 0.96)",
            backdropFilter: "blur(16px)",
            border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
            boxShadow: isLight
              ? "0 12px 36px rgba(0, 0, 0, 0.16)"
              : "0 12px 36px rgba(0, 0, 0, 0.5)",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: isLight
                ? "0 16px 44px rgba(0, 0, 0, 0.22)"
                : "0 16px 44px rgba(0, 0, 0, 0.6)",
            },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            {/* Sender Avatar */}
            <Box sx={{ position: "relative" }}>
              <Avatar
                src={avatarSrc}
                alt={notification.senderName || "Sender"}
                sx={{ width: 44, height: 44, border: `2px solid ${theme.palette.primary.main}` }}
              >
                {(notification.senderName || "U")[0]}
              </Avatar>
              <Box
                sx={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  bgcolor: "#10B981",
                  border: `2px solid ${isLight ? "#fff" : "#1e293b"}`,
                }}
              />
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: "text.primary",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {notification.senderName || "New Message"}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "primary.main",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    flexShrink: 0,
                  }}
                >
                  Just now
                </Typography>
              </Stack>

              <Typography
                variant="body2"
                sx={{
                  mt: 0.35,
                  color: "text.secondary",
                  fontSize: "0.85rem",
                  lineHeight: 1.3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {notification.contentPreview || "Sent you a message"}
              </Typography>
            </Box>

            {/* Quick Action & Close */}
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                sx={{ color: "text.secondary", p: 0.75 }}
              >
                <X size={18} />
              </IconButton>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </Slide>
  );
};

export default InAppNotification;
