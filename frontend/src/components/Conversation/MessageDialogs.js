import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  Popover,
  Stack,
  IconButton,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { socket } from "../../socket";
import { showSnackbar } from "../../redux/slices/app";
import {
  DeleteDirectMessage,
  ReactDirectMessage,
} from "../../redux/slices/Conversation";

/* ====================================================================
   FORWARD MESSAGE DIALOG
==================================================================== */
export const ForwardDialog = ({ open, handleClose, message }) => {
  const dispatch = useDispatch();
  const [selectedChatId, setSelectedChatId] = useState(null);

  const { conversations } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { user_id } = useSelector((state) => state.auth);
  const currentUserId = user_id || window.localStorage.getItem("user_id");

  const handleForward = () => {
    if (!selectedChatId) return;

    const targetConv = conversations.find(
      (c) => c?.id?.toString() === selectedChatId?.toString()
    );

    if (targetConv) {
      socket.emit("text_message", {
        to: targetConv.user_id,
        from: currentUserId,
        message: message?.message || "Forwarded message",
        conversation_id: targetConv.id,
        type: message?.subtype || "Text",
      });

      dispatch(
        showSnackbar({
          severity: "success",
          message: `Message forwarded to ${targetConv.name}`,
        })
      );
    }

    handleClose();
    setSelectedChatId(null);
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>Forward Message</DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            p: 1.5,
            mb: 2,
            bgcolor: (theme) =>
              theme.palette.mode === "light" ? "#f4f6f8" : "#212b36",
            borderRadius: 1,
            borderLeft: (theme) => `3px solid ${theme.palette.primary.main}`,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {message?.message || "Forwarded message"}
          </Typography>
        </Box>

        <Typography
          variant="caption"
          sx={{ color: "text.secondary", mb: 1, display: "block" }}
        >
          Select conversation to forward to:
        </Typography>

        <List sx={{ maxHeight: 240, overflowY: "auto" }}>
          {conversations && conversations.length > 0 ? (
            conversations.map((c) => (
              <ListItem
                button
                key={c.id}
                selected={selectedChatId === c.id}
                onClick={() => setSelectedChatId(c.id)}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemAvatar>
                  <Avatar src={c.img} alt={c.name} />
                </ListItemAvatar>
                <ListItemText
                  primary={c.name}
                  secondary={c.online ? "Online" : "Offline"}
                />
              </ListItem>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              No other conversations found.
            </Typography>
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!selectedChatId}
          onClick={handleForward}
        >
          Forward
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ====================================================================
   REPORT MESSAGE DIALOG
==================================================================== */
export const ReportDialog = ({ open, handleClose, message }) => {
  const dispatch = useDispatch();
  const [reason, setReason] = useState("Spam");
  const { room_id } = useSelector((state) => state.app);
  const { user_id } = useSelector((state) => state.auth);
  const currentUserId = user_id || window.localStorage.getItem("user_id");

  const handleReport = () => {
    socket.emit("report_message", {
      conversation_id: room_id,
      message_id: message?.id,
      reason,
      reported_by: currentUserId,
    });

    dispatch(
      showSnackbar({
        severity: "success",
        message: "Report submitted. Thank you for making our platform safe.",
      })
    );

    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>Report Message</DialogTitle>
      <DialogContent dividers>
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", mb: 2, display: "block" }}
        >
          Why are you reporting this message?
        </Typography>

        <RadioGroup value={reason} onChange={(e) => setReason(e.target.value)}>
          {[
            "Spam",
            "Harassment or bullying",
            "Hate speech or symbols",
            "Inappropriate content",
            "Scam or fraud",
          ].map((opt) => (
            <FormControlLabel
              key={opt}
              value={opt}
              control={<Radio size="small" />}
              label={<Typography variant="body2">{opt}</Typography>}
            />
          ))}
        </RadioGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={handleReport}>
          Submit Report
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ====================================================================
   DELETE MESSAGE CONFIRMATION DIALOG
==================================================================== */
export const DeleteMessageDialog = ({ open, handleClose, message }) => {
  const dispatch = useDispatch();
  const { room_id } = useSelector((state) => state.app);
  const { user_id } = useSelector((state) => state.auth);
  const current_user_id = user_id || window.localStorage.getItem("user_id");

  // Determine if this message was sent by the current user:
  const isSender = Boolean(
    message?.outgoing ||
      (message?.from &&
        (message.from?._id || message.from)?.toString() ===
          current_user_id?.toString())
  );

  const isAlreadyDeleted = Boolean(message?.deleted);

  const handleDelete = (deleteType) => {
    if (!message?.id) {
      handleClose();
      return;
    }

    socket.emit(
      "delete_message",
      {
        conversation_id: room_id,
        message_id: message.id,
        delete_for: deleteType, // "me" | "everyone"
        user_id: current_user_id,
      },
      (res) => {
        if (res?.status === "error") {
          dispatch(
            showSnackbar({
              severity: "error",
              message: res.message || "Failed to delete message",
            })
          );
        }
      }
    );

    dispatch(
      DeleteDirectMessage({
        conversation_id: room_id,
        message_id: message.id,
        delete_for: deleteType,
      })
    );

    dispatch(
      showSnackbar({
        severity: "success",
        message:
          deleteType === "everyone"
            ? "Message deleted for everyone"
            : "Message deleted for you",
      })
    );

    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Delete message?</DialogTitle>
      <DialogContent sx={{ pb: 2 }}>
        <DialogContentText>
          {isAlreadyDeleted
            ? "Delete this message from your chat history?"
            : isSender
            ? "You can delete this message for everyone or delete it just for yourself."
            : "Delete message for yourself? Other participants in the chat will still be able to see it."}
        </DialogContentText>
      </DialogContent>
      <DialogActions
        sx={{
          flexDirection: { xs: "column-reverse", sm: "row" },
          gap: 1,
          px: 3,
          pb: 2.5,
          pt: 1,
        }}
      >
        <Button onClick={handleClose} color="inherit" sx={{ minWidth: 80 }}>
          Cancel
        </Button>
        <Button
          variant={isSender && !isAlreadyDeleted ? "outlined" : "contained"}
          color={isSender && !isAlreadyDeleted ? "primary" : "error"}
          onClick={() => handleDelete("me")}
          sx={{ minWidth: 120 }}
        >
          Delete for me
        </Button>
        {isSender && !isAlreadyDeleted && (
          <Button
            variant="contained"
            color="error"
            onClick={() => handleDelete("everyone")}
            sx={{ minWidth: 155 }}
          >
            Delete for everyone
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

/* ====================================================================
   REACTION BAR POPOVER
==================================================================== */
const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export const ReactionPopover = ({
  anchorEl,
  open,
  handleClose,
  message,
}) => {
  const dispatch = useDispatch();
  const { room_id } = useSelector((state) => state.app);

  const handleSelectReaction = (emoji) => {
    if (!message?.id) {
      handleClose();
      return;
    }

    const nextReaction = message.reaction === emoji ? "" : emoji;

    socket.emit("react_message", {
      conversation_id: room_id,
      message_id: message.id,
      reaction: nextReaction,
    });

    dispatch(
      ReactDirectMessage({
        conversation_id: room_id,
        message_id: message.id,
        reaction: nextReaction,
      })
    );

    handleClose();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{
        vertical: "top",
        horizontal: "center",
      }}
      transformOrigin={{
        vertical: "bottom",
        horizontal: "center",
      }}
      PaperProps={{
        sx: {
          p: 0.5,
          borderRadius: 3,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        },
      }}
    >
      <Stack direction="row" spacing={0.5}>
        {EMOJI_REACTIONS.map((emoji) => (
          <IconButton
            key={emoji}
            size="small"
            onClick={() => handleSelectReaction(emoji)}
            sx={{
              fontSize: "1.25rem",
              p: 0.75,
              transition: "transform 0.15s ease",
              "&:hover": {
                transform: "scale(1.25)",
              },
            }}
          >
            {emoji}
          </IconButton>
        ))}
      </Stack>
    </Popover>
  );
};
