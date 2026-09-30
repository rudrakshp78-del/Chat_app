import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Avatar,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  CaretLeft,
  CaretRight,
  Eye,
  PaperPlaneTilt,
  Trash,
  X,
  Play,
  Pause,
} from "phosphor-react";
import { useDispatch, useSelector } from "react-redux";
import { MarkStatusViewed, DeleteStatus } from "../../../redux/slices/status";
import { showSnackbar } from "../../../redux/slices/app";
import { socket } from "../../../socket";
import { fToNow, fDateTimeSuffix } from "../../../utils/formatTime";
import getAvatarUrl from "../../../utils/getAvatarUrl";

const DURATION_PER_STATUS = 5000; // 5 seconds per status
const TICK_INTERVAL = 50; // update progress every 50ms

const StatusPlayer = ({
  user,
  statuses = [],
  initialIndex = 0,
  isOwn = false,
  onClose,
  onNextUser,
  onPrevUser,
}) => {
  const dispatch = useDispatch();

  const { user_id } = useSelector((state) => state.auth);
  const currentUserId = user_id || window.localStorage.getItem("user_id");

  const [currentIndex, setCurrentIndex] = useState(
    Math.min(initialIndex, Math.max(0, statuses.length - 1))
  );
  const [progress, setProgress] = useState(0); // 0 to 100 for current status
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [openViewersModal, setOpenViewersModal] = useState(false);

  const currentStatus = statuses[currentIndex];

  // Ref to hold pause status without triggering effect restarts
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  // Mark current status as viewed if viewing someone else's
  useEffect(() => {
    if (currentStatus && !isOwn && currentStatus._id) {
      dispatch(MarkStatusViewed(currentStatus._id));
    }
  }, [currentStatus, isOwn, dispatch]);

  // Navigate to Next status
  const handleNext = useCallback(() => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      // Completed all statuses of this user
      if (onNextUser) {
        onNextUser();
      } else if (onClose) {
        onClose();
      }
    }
  }, [currentIndex, statuses.length, onNextUser, onClose]);

  // Navigate to Previous status
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    } else if (onPrevUser) {
      onPrevUser();
    }
  }, [currentIndex, onPrevUser]);

  // Timer loop for progress bar
  useEffect(() => {
    setProgress(0);

    const step = (100 / (DURATION_PER_STATUS / TICK_INTERVAL));
    const timer = setInterval(() => {
      if (!isPausedRef.current) {
        setProgress((prev) => {
          if (prev >= 100) {
            handleNext();
            return 0;
          }
          return prev + step;
        });
      }
    }, TICK_INTERVAL);

    return () => clearInterval(timer);
  }, [currentIndex, handleNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "Escape") {
        if (onClose) onClose();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  // Handle Delete Status (author only)
  const handleDeleteStatus = () => {
    if (!currentStatus?._id) return;
    if (window.confirm("Are you sure you want to delete this status update?")) {
      dispatch(DeleteStatus(currentStatus._id));
      if (statuses.length <= 1) {
        if (onClose) onClose();
      } else {
        handleNext();
      }
    }
  };

  // Handle Send Reply to Status
  const handleSendReply = () => {
    if (!replyText.trim() || !user?._id || !currentUserId) return;

    const statusContext =
      currentStatus?.type === "text"
        ? `Status: "${currentStatus?.content}"`
        : `Status: [Photo] ${currentStatus?.content || ""}`.trim();

    socket.emit("text_message", {
      to: user._id,
      from: currentUserId,
      message: replyText.trim(),
      type: "Reply",
      reply: statusContext,
    });

    dispatch(
      showSnackbar({
        severity: "success",
        message: `Reply sent to ${user?.firstName || "user"}!`,
      })
    );

    setReplyText("");
    setIsPaused(false);
  };

  if (!currentStatus) {
    return null;
  }

  const authorName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "User";
  const authorAvatar = getAvatarUrl(user?.avatar, user?.firstName);
  const viewersList = currentStatus.viewers || [];

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        position: "relative",
        bgcolor: "#000000",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        overflow: "hidden",
      }}
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* =================================================================
          TOP SEGMENTED PROGRESS BARS (WhatsApp Standard)
          ================================================================= */}
      <Stack
        direction="row"
        spacing={0.75}
        sx={{
          position: "absolute",
          top: 12,
          left: 12,
          right: 12,
          zIndex: 10,
        }}
      >
        {statuses.map((item, idx) => {
          let fillWidth = "0%";
          if (idx < currentIndex) fillWidth = "100%";
          else if (idx === currentIndex) fillWidth = `${progress}%`;

          return (
            <Box
              key={item._id || idx}
              sx={{
                flex: 1,
                height: 3,
                bgcolor: "rgba(255, 255, 255, 0.35)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  height: "100%",
                  bgcolor: "#ffffff",
                  width: fillWidth,
                  transition:
                    idx === currentIndex
                      ? "width 50ms linear"
                      : "none",
                }}
              />
            </Box>
          );
        })}
      </Stack>

      {/* =================================================================
          HEADER: Author Info & Controls
          ================================================================= */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          position: "absolute",
          top: 24,
          left: 12,
          right: 12,
          zIndex: 10,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
          pt: 1,
          pb: 2,
          px: 1,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar
            src={authorAvatar}
            alt={authorName}
            sx={{ width: 42, height: 42, border: "2px solid #25D366" }}
          />
          <Stack spacing={0}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ color: "#fff", lineHeight: 1.2 }}>
              {isOwn ? "My Status" : authorName}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)" }}>
              {currentStatus.createdAt
                ? fToNow(currentStatus.createdAt)
                : "Just now"}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setIsPaused((prev) => !prev);
            }}
            sx={{ color: "#ffffff" }}
          >
            {isPaused ? <Play size={20} /> : <Pause size={20} />}
          </IconButton>

          {isOwn && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteStatus();
              }}
              sx={{ color: "#ff6b6b" }}
            >
              <Trash size={20} />
            </IconButton>
          )}

          {onClose && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              sx={{ color: "#ffffff" }}
            >
              <X size={24} />
            </IconButton>
          )}
        </Stack>
      </Stack>

      {/* =================================================================
          STATUS CONTENT DISPLAY (Text or Image)
          ================================================================= */}
      <Box
        sx={{
          flex: 1,
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background:
            currentStatus.type === "text"
              ? currentStatus.background || "#00a884"
              : "#000000",
        }}
      >
        {currentStatus.type === "text" ? (
          <Box
            sx={{
              maxWidth: "85%",
              p: 3,
              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                color: "#ffffff",
                fontSize: { xs: "1.4rem", sm: "2rem", md: "2.4rem" },
                fontWeight: 600,
                fontFamily: currentStatus.fontFamily || "sans-serif",
                lineHeight: 1.4,
                wordBreak: "break-word",
                whiteSpace: "pre-wrap",
                textShadow: "0 2px 8px rgba(0, 0, 0, 0.45)",
              }}
            >
              {currentStatus.content}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <img
              src={currentStatus.media}
              alt="Status"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />

            {/* Optional photo caption */}
            {currentStatus.content && (
              <Box
                sx={{
                  position: "absolute",
                  bottom: isOwn ? 60 : 76,
                  left: 16,
                  right: 16,
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: "rgba(0, 0, 0, 0.65)",
                  backdropFilter: "blur(6px)",
                  textAlign: "center",
                }}
              >
                <Typography variant="body1" sx={{ color: "#ffffff", fontWeight: 500 }}>
                  {currentStatus.content}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* =================================================================
            TAP NAVIGATION ZONES (Left 30% / Right 70%) & ARROW BUTTONS
            ================================================================= */}
        <Box
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          sx={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: "35%",
            zIndex: 5,
            cursor: "pointer",
          }}
        />
        <Box
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          sx={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            width: "65%",
            zIndex: 5,
            cursor: "pointer",
          }}
        />

        {/* Desktop Arrow Controls */}
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          sx={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            bgcolor: "rgba(0,0,0,0.4)",
            color: "#ffffff",
            "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
            display: { xs: "none", sm: "flex" },
          }}
        >
          <CaretLeft size={24} />
        </IconButton>

        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          sx={{
            position: "absolute",
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            bgcolor: "rgba(0,0,0,0.4)",
            color: "#ffffff",
            "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
            display: { xs: "none", sm: "flex" },
          }}
        >
          <CaretRight size={24} />
        </IconButton>
      </Box>

      {/* =================================================================
          BOTTOM ACTION BAR:
          - For Author: Viewer count and viewers list modal
          - For Viewer: WhatsApp reply input
          ================================================================= */}
      <Box
        sx={{
          position: "relative",
          zIndex: 10,
          p: 1.5,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
        }}
      >
        {isOwn ? (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="center"
            spacing={1}
            onClick={(e) => {
              e.stopPropagation();
              setOpenViewersModal(true);
            }}
            sx={{
              cursor: "pointer",
              py: 0.5,
              borderRadius: 2,
              "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
            }}
          >
            <Eye size={20} />
            <Typography variant="subtitle2" fontWeight="bold">
              {viewersList.length === 0
                ? "No views yet"
                : `${viewersList.length} ${
                    viewersList.length === 1 ? "view" : "views"
                  }`}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
              (Tap to see who viewed)
            </Typography>
          </Stack>
        ) : (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            onClick={(e) => e.stopPropagation()}
          >
            <TextField
              fullWidth
              size="small"
              placeholder={`Reply to ${user?.firstName || "status"}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              sx={{
                bgcolor: "rgba(255,255,255,0.15)",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  color: "#ffffff",
                  borderRadius: 3,
                  "& fieldset": { borderColor: "transparent" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.3)" },
                },
                "& input::placeholder": {
                  color: "rgba(255,255,255,0.7)",
                  opacity: 1,
                },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={handleSendReply}
                      disabled={!replyText.trim()}
                      sx={{
                        color: replyText.trim() ? "#25D366" : "rgba(255,255,255,0.4)",
                      }}
                    >
                      <PaperPlaneTilt size={20} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        )}
      </Box>

      {/* =================================================================
          VIEWERS MODAL (Who saw your status)
          ================================================================= */}
      <Dialog
        open={openViewersModal}
        onClose={() => setOpenViewersModal(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Viewed by ({viewersList.length})
          </Typography>
          <IconButton size="small" onClick={() => setOpenViewersModal(false)}>
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 0, maxHeight: 360 }}>
          {viewersList.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                No views yet. When someone views your status, they will appear here!
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {viewersList.map((viewerItem, idx) => {
                const vUser = viewerItem.user;
                const vName = vUser
                  ? `${vUser.firstName || ""} ${vUser.lastName || ""}`.trim()
                  : "User";
                const vAvatar = getAvatarUrl(vUser?.avatar, vUser?.firstName);

                return (
                  <ListItem key={viewerItem._id || idx} divider>
                    <ListItemAvatar>
                      <Avatar src={vAvatar} alt={vName} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={vName}
                      secondary={
                        viewerItem.viewedAt
                          ? fDateTimeSuffix(viewerItem.viewedAt)
                          : "Recently"
                      }
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default StatusPlayer;
