import React from "react";
import {
  Box,
  Divider,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowBendUpLeft,
  ArrowBendUpRight,
  Check,
  Checks,
  DotsThreeVertical,
  DownloadSimple,
  FileText,
  MusicNotes,
  Pause,
  Play,
  Prohibit,
  Smiley,
  Star,
  Trash,
  WarningOctagon,
} from "phosphor-react";

import { fMessageTime } from "../../utils/formatTime";
import { playSongPreview, stopAllSongPreviews } from "../../utils/storyMusicPlayer";
import { socket } from "../../socket";
import { showSnackbar } from "../../redux/slices/app";
import {
  SetReplyingTo,
  StarDirectMessage,
  ReactDirectMessage,
} from "../../redux/slices/Conversation";
import {
  ForwardDialog,
  ReportDialog,
  DeleteMessageDialog,
  ReactionPopover,
} from "./MessageDialogs";

/* =========================
   MESSAGE OPTIONS
========================= */

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const MessageOptions = ({ el, externalAnchorEl, setExternalAnchorEl }) => {
  const dispatch = useDispatch();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [reactionAnchorEl, setReactionAnchorEl] = React.useState(null);
  const [openForward, setOpenForward] = React.useState(false);
  const [openReport, setOpenReport] = React.useState(false);
  const [openDelete, setOpenDelete] = React.useState(false);

  const { room_id } = useSelector((state) => state.app);

  const activeAnchor = anchorEl || externalAnchorEl;
  const open = Boolean(activeAnchor);

  const handleClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    if (setExternalAnchorEl) {
      setExternalAnchorEl(null);
    }
  };

  const handleQuickReact = (emoji) => {
    handleClose();
    if (!el?.id) return;
    const newReaction = el.reaction === emoji ? "" : emoji;
    socket.emit("react_message", {
      conversation_id: room_id,
      message_id: el.id,
      reaction: newReaction,
    });
    dispatch(
      ReactDirectMessage({
        conversation_id: room_id,
        message_id: el.id,
        reaction: newReaction,
      })
    );
  };

  const handleAction = (action) => {
    const currentAnchor = activeAnchor;
    handleClose();

    switch (action) {
      case "reply":
        dispatch(SetReplyingTo(el));
        window.dispatchEvent(new CustomEvent("focus_chat_input"));
        break;

      case "react":
        setReactionAnchorEl(currentAnchor);
        break;

      case "forward":
        setOpenForward(true);
        break;

      case "star":
        if (el?.id) {
          socket.emit("star_message", {
            conversation_id: room_id,
            message_id: el.id,
          });
          dispatch(
            StarDirectMessage({
              conversation_id: room_id,
              message_id: el.id,
              starred: !el.starred,
            })
          );
          dispatch(
            showSnackbar({
              severity: "success",
              message: el.starred ? "Message unstarred" : "Message starred",
            })
          );
        }
        break;

      case "report":
        setOpenReport(true);
        break;

      case "delete":
        setOpenDelete(true);
        break;

      default:
        break;
    }
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={handleClick}
        sx={{
          p: 0.5,
          opacity: 0.7,
          "&:hover": { opacity: 1 },
        }}
      >
        <DotsThreeVertical size={18} />
      </IconButton>

      <Menu
        anchorEl={activeAnchor}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            minWidth: 190,
            borderRadius: 2,
            boxShadow: "0 6px 20px rgba(0,0,0,0.16)",
          },
        }}
      >
        {!el?.deleted ? (
          <>
            {/* WhatsApp-style Quick Emoji Reactions on Hold / 3-Dot Menu */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-around"
              sx={{ px: 1, py: 0.75 }}
            >
              {QUICK_REACTIONS.map((emoji) => (
                <IconButton
                  key={emoji}
                  size="small"
                  onClick={() => handleQuickReact(emoji)}
                  sx={{
                    fontSize: "1.15rem",
                    p: 0.5,
                    bgcolor:
                      el?.reaction === emoji
                        ? "action.selected"
                        : "transparent",
                    transition: "transform 0.15s ease",
                    "&:hover": { transform: "scale(1.25)" },
                  }}
                >
                  <span>{emoji}</span>
                </IconButton>
              ))}
            </Stack>

            <Divider sx={{ my: 0.5 }} />

            <MenuItem onClick={() => handleAction("reply")} sx={{ gap: 1.5 }}>
              <ArrowBendUpLeft size={18} />
              <Typography variant="body2">Reply</Typography>
            </MenuItem>

            <MenuItem onClick={() => handleAction("react")} sx={{ gap: 1.5 }}>
              <Smiley size={18} />
              <Typography variant="body2">React to message</Typography>
            </MenuItem>

            <MenuItem onClick={() => handleAction("forward")} sx={{ gap: 1.5 }}>
              <ArrowBendUpRight size={18} />
              <Typography variant="body2">Forward message</Typography>
            </MenuItem>

            <MenuItem onClick={() => handleAction("star")} sx={{ gap: 1.5 }}>
              <Star
                size={18}
                weight={el?.starred ? "fill" : "regular"}
                color={el?.starred ? "#f5a623" : "inherit"}
              />
              <Typography variant="body2">
                {el?.starred ? "Unstar message" : "Star message"}
              </Typography>
            </MenuItem>

            <MenuItem onClick={() => handleAction("report")} sx={{ gap: 1.5 }}>
              <WarningOctagon size={18} />
              <Typography variant="body2">Report</Typography>
            </MenuItem>

            <Divider sx={{ my: 0.5 }} />

            <MenuItem
              onClick={() => handleAction("delete")}
              sx={{ gap: 1.5, color: "error.main" }}
            >
              <Trash size={18} />
              <Typography variant="body2" color="error">
                Delete Message
              </Typography>
            </MenuItem>
          </>
        ) : (
          <MenuItem
            onClick={() => handleAction("delete")}
            sx={{ gap: 1.5, color: "error.main" }}
          >
            <Trash size={18} />
            <Typography variant="body2" color="error">
              Delete for me
            </Typography>
          </MenuItem>
        )}
      </Menu>

      {/* Reaction Popover */}
      <ReactionPopover
        anchorEl={reactionAnchorEl}
        open={Boolean(reactionAnchorEl)}
        handleClose={() => setReactionAnchorEl(null)}
        message={el}
      />

      {/* Forward Dialog */}
      <ForwardDialog
        open={openForward}
        handleClose={() => setOpenForward(false)}
        message={el}
      />

      {/* Report Dialog */}
      <ReportDialog
        open={openReport}
        handleClose={() => setOpenReport(false)}
        message={el}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteMessageDialog
        open={openDelete}
        handleClose={() => setOpenDelete(false)}
        message={el}
      />
    </>
  );
};

/* =========================
   MESSAGE BUBBLE
========================= */

const SWIPE_REPLY_THRESHOLD = 44;
const HOLD_DURATION_MS = 750; // ~1 second hold to open options menu

const MessageBubble = ({ el, children }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { room_id } = useSelector((state) => state.app);

  const bubbleRef = React.useRef(null);
  const longPressTimerRef = React.useRef(null);
  const gestureRef = React.useRef({
    active: false,
    startX: 0,
    startY: 0,
    swiping: false,
    longPressed: false,
  });

  const [externalAnchorEl, setExternalAnchorEl] = React.useState(null);
  const [swipeOffset, setSwipeOffset] = React.useState(0);
  const [isSwiping, setIsSwiping] = React.useState(false);

  const clearHoldTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  React.useEffect(() => {
    return () => clearHoldTimer();
  }, []);

  const startGesture = (clientX, clientY) => {
    clearHoldTimer();
    gestureRef.current = {
      active: true,
      startX: clientX,
      startY: clientY,
      swiping: false,
      longPressed: false,
    };

    longPressTimerRef.current = setTimeout(() => {
      if (gestureRef.current.active && !gestureRef.current.swiping) {
        gestureRef.current.longPressed = true;
        gestureRef.current.active = false;
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(30);
        }
        setExternalAnchorEl(bubbleRef.current);
      }
    }, HOLD_DURATION_MS);
  };

  const moveGesture = (clientX, clientY) => {
    if (!gestureRef.current.active) return;

    const dx = clientX - gestureRef.current.startX;
    const dy = clientY - gestureRef.current.startY;

    // Cancel hold timer if finger/mouse moves significantly
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      clearHoldTimer();
    }

    if (el?.deleted) return;

    // Horizontal slide to reply (like WhatsApp)
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      // Allow sliding right on any message, or sliding left on outgoing messages
      if (dx > 0) {
        gestureRef.current.swiping = true;
        setIsSwiping(true);
        const damped = Math.min(72, (dx - 10) * 0.75);
        setSwipeOffset(damped);
      } else if (dx < 0 && !el.incoming) {
        gestureRef.current.swiping = true;
        setIsSwiping(true);
        const damped = Math.max(-72, (dx + 10) * 0.75);
        setSwipeOffset(damped);
      }
    }
  };

  const endGesture = () => {
    clearHoldTimer();
    if (gestureRef.current.swiping) {
      if (Math.abs(swipeOffset) >= SWIPE_REPLY_THRESHOLD && !el?.deleted) {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(25);
        }
        dispatch(SetReplyingTo(el));
        window.dispatchEvent(new CustomEvent("focus_chat_input"));
      }
    }
    gestureRef.current.active = false;
    gestureRef.current.swiping = false;
    setIsSwiping(false);
    setSwipeOffset(0);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearHoldTimer();
    setExternalAnchorEl(bubbleRef.current);
  };

  const handleToggleReaction = () => {
    if (!el?.id || !el?.reaction) return;
    socket.emit("react_message", {
      conversation_id: room_id,
      message_id: el.id,
      reaction: "",
    });
    dispatch(
      ReactDirectMessage({
        conversation_id: room_id,
        message_id: el.id,
        reaction: "",
      })
    );
  };

  const swipeProgress = Math.min(
    1,
    Math.abs(swipeOffset) / SWIPE_REPLY_THRESHOLD
  );
  const isReadyToReply = Math.abs(swipeOffset) >= SWIPE_REPLY_THRESHOLD;

  return (
    <Stack
      direction="row"
      justifyContent={el.incoming ? "flex-start" : "flex-end"}
      alignItems="center"
      sx={{
        width: "100%",
        position: "relative",
        mb: el.reaction ? 1.5 : 0.5,
        touchAction: "pan-y",
      }}
    >
      {/* WhatsApp Slide-to-Reply Indicator Icon */}
      {swipeOffset !== 0 && !el.deleted && (
        <Box
          sx={{
            position: "absolute",
            ...(swipeOffset > 0
              ? { left: el.incoming ? 4 : "auto", right: el.incoming ? "auto" : "calc(75% + 12px)" }
              : { right: 8 }),
            zIndex: 2,
            width: 34,
            height: 34,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: isReadyToReply
              ? theme.palette.primary.main
              : alpha(theme.palette.background.paper, 0.9),
            color: isReadyToReply ? "#fff" : theme.palette.text.secondary,
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            opacity: swipeProgress,
            transform: `scale(${0.6 + swipeProgress * 0.45})`,
            transition: "background-color 0.15s ease, color 0.15s ease",
            pointerEvents: "none",
          }}
        >
          <ArrowBendUpLeft size={18} weight="bold" />
        </Box>
      )}

      <Box
        ref={bubbleRef}
        onContextMenu={handleContextMenu}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          if (touch) startGesture(touch.clientX, touch.clientY);
        }}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          if (touch) moveGesture(touch.clientX, touch.clientY);
        }}
        onTouchEnd={endGesture}
        onTouchCancel={endGesture}
        onMouseDown={(e) => {
          if (e.button === 0) startGesture(e.clientX, e.clientY);
        }}
        onMouseMove={(e) => {
          if (gestureRef.current.active) moveGesture(e.clientX, e.clientY);
        }}
        onMouseUp={endGesture}
        onMouseLeave={endGesture}
        sx={{
          position: "relative",
          width: "fit-content",
          maxWidth: { xs: "82%", sm: "75%" },
          flexShrink: 0,
          p: 1.5,
          borderRadius: 1.5,
          userSelect: "none",
          WebkitUserSelect: "none",
          cursor: "grab",
          transform:
            swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : "none",
          transition: isSwiping
            ? "none"
            : "transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)",
          backgroundColor: el.incoming
            ? theme.palette.background.default
            : theme.palette.primary.main,
          boxShadow:
            theme.palette.mode === "light"
              ? "0 1px 2px rgba(0,0,0,0.06)"
              : "0 1px 2px rgba(0,0,0,0.3)",
        }}
      >
        {/* Star Icon in top-corner */}
        {el.starred && !el.deleted && (
          <Box
            sx={{
              position: "absolute",
              top: -6,
              ...(el.incoming ? { right: -6 } : { left: -6 }),
              color: "#f5a623",
              backgroundColor: theme.palette.background.paper,
              borderRadius: "50%",
              p: 0.25,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              zIndex: 3,
            }}
          >
            <Star size={12} weight="fill" color="#f5a623" />
          </Box>
        )}

        {/* Quoted Reply Box if present */}
        {el.reply && !el.deleted && (
          <Box
            sx={{
              mb: 1,
              p: 1,
              backgroundColor: el.incoming
                ? alpha(theme.palette.primary.main, 0.08)
                : alpha("#000", 0.15),
              borderLeft: `3px solid ${
                el.incoming ? theme.palette.primary.main : "#fff"
              }`,
              borderRadius: 0.75,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: el.incoming ? theme.palette.primary.main : "#fff",
                display: "block",
              }}
            >
              Reply
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontSize: "0.8rem",
                color: el.incoming
                  ? "text.secondary"
                  : "rgba(255,255,255,0.85)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 220,
              }}
            >
              {el.reply}
            </Typography>
          </Box>
        )}

        {children}

        {/* WhatsApp-style Time & Blue Double Checkmarks */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-end"
          spacing={0.5}
          sx={{
            mt: 0.35,
            ml: "auto",
            width: "fit-content",
            userSelect: "none",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.68rem",
              fontWeight: 500,
              color: el.incoming
                ? theme.palette.text.secondary
                : "rgba(255, 255, 255, 0.78)",
              lineHeight: 1,
            }}
          >
            {fMessageTime(el.created_at || el.time)}
          </Typography>
          {(!el.incoming || el.outgoing) && !el.deleted && (
            <>
              {el.status === "seen" || el.seen ? (
                <Checks
                  size={15}
                  weight="bold"
                  title="Seen"
                  style={{
                    color: "#53bdeb",
                    display: "inline-block",
                    verticalAlign: "middle",
                  }}
                />
              ) : el.status === "delivered" ? (
                <Checks
                  size={15}
                  weight="bold"
                  title="Delivered"
                  style={{
                    color: "rgba(255, 255, 255, 0.72)",
                    display: "inline-block",
                    verticalAlign: "middle",
                  }}
                />
              ) : (
                <Check
                  size={15}
                  weight="bold"
                  title="Sent"
                  style={{
                    color: "rgba(255, 255, 255, 0.72)",
                    display: "inline-block",
                    verticalAlign: "middle",
                  }}
                />
              )}
            </>
          )}
        </Stack>

        {/* Three dots options */}
        <Box
          sx={{
            position: "absolute",
            top: -14,
            ...(el.incoming ? { right: -28 } : { left: -28 }),
            zIndex: 10,
          }}
        >
          <MessageOptions
            el={el}
            externalAnchorEl={externalAnchorEl}
            setExternalAnchorEl={setExternalAnchorEl}
          />
        </Box>

        {/* Reaction badge */}
        {el.reaction && !el.deleted && (
          <Box
            onClick={handleToggleReaction}
            title="Click to remove reaction"
            sx={{
              position: "absolute",
              bottom: -10,
              ...(el.incoming ? { left: 8 } : { right: 8 }),
              backgroundColor: theme.palette.background.paper,
              borderRadius: "12px",
              px: 0.7,
              py: 0.2,
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              fontSize: "0.85rem",
              lineHeight: 1.2,
              cursor: "pointer",
              border: `1px solid ${theme.palette.divider}`,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              zIndex: 5,
              transition: "transform 0.1s ease",
              "&:hover": {
                transform: "scale(1.15)",
              },
            }}
          >
            <span>{el.reaction}</span>
          </Box>
        )}
      </Box>
    </Stack>
  );
};

/* =========================
   DELETED MESSAGE (WhatsApp style)
========================= */

const DeletedMsg = ({ el }) => {
  const theme = useTheme();

  return (
    <MessageBubble el={el}>
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ py: 0.25, px: 0.25 }}>
        <Prohibit
          size={16}
          weight="bold"
          style={{
            opacity: 0.7,
            color: el.incoming ? theme.palette.text.secondary : "#fff",
          }}
        />
        <Typography
          variant="body2"
          sx={{
            fontStyle: "italic",
            color: el.incoming
              ? theme.palette.text.secondary
              : "rgba(255,255,255,0.85)",
            wordBreak: "break-word",
          }}
        >
          {el.outgoing ? "You deleted this message" : "This message was deleted"}
        </Typography>
      </Stack>
    </MessageBubble>
  );
};

/* =========================
   TEXT MESSAGE
========================= */

const TextMsg = ({ el }) => {
  const theme = useTheme();

  if (el?.deleted) {
    return <DeletedMsg el={el} />;
  }

  return (
    <MessageBubble el={el}>
      <Typography
        variant="body2"
        sx={{
          color: el.incoming ? theme.palette.text.primary : "#fff",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
        }}
      >
        {el.message}
      </Typography>
    </MessageBubble>
  );
};

/* =========================
   MEDIA MESSAGE
========================= */

const MediaMsg = ({ el }) => {
  const theme = useTheme();
  const [isPlaying, setIsPlaying] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (isPlaying) stopAllSongPreviews();
    };
  }, [isPlaying]);

  if (el?.deleted) {
    return <DeletedMsg el={el} />;
  }

  const handleToggleSong = (e) => {
    e.stopPropagation();
    if (!el?.song) return;
    if (isPlaying) {
      stopAllSongPreviews();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playSongPreview(el.song, () => setIsPlaying(false));
    }
  };

  return (
    <MessageBubble el={el}>
      <Stack spacing={1}>
        <Box
          component="img"
          src={el.img || el.file}
          alt={el.message || "Shared photo"}
          sx={{
            display: "block",
            width: "100%",
            maxWidth: 290,
            height: "auto",
            maxHeight: 320,
            objectFit: "contain",
            borderRadius: 1.5,
            bgcolor: "rgba(0,0,0,0.06)",
          }}
        />

        {/* Instagram Story Song Player Bar on Shared Photo */}
        {el?.song?.title && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            onClick={handleToggleSong}
            sx={{
              px: 1.25,
              py: 0.7,
              borderRadius: 99,
              bgcolor: "rgba(18, 18, 24, 0.85)",
              color: "#fff",
              cursor: "pointer",
              transition: "transform 0.15s ease",
              "&:hover": { transform: "scale(1.02)" },
            }}
          >
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                bgcolor: isPlaying ? "#00E676" : "#FF4081",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {isPlaying ? (
                <Pause size={13} weight="fill" color="#fff" />
              ) : (
                <Play size={13} weight="fill" color="#fff" />
              )}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="caption"
                noWrap
                sx={{ display: "block", fontWeight: 700, color: "#fff", lineHeight: 1.15 }}
              >
                🎵 {el.song.title}
              </Typography>
              {el.song.artist && (
                <Typography
                  variant="caption"
                  noWrap
                  sx={{
                    display: "block",
                    fontSize: "0.66rem",
                    color: "rgba(255,255,255,0.75)",
                    lineHeight: 1.1,
                  }}
                >
                  {el.song.artist}
                </Typography>
              )}
            </Box>
            <MusicNotes size={16} color="#00E676" weight="bold" />
          </Stack>
        )}

        {el.message && (
          <Typography
            variant="body2"
            sx={{
              color: el.incoming ? theme.palette.text.primary : "#fff",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            {el.message}
          </Typography>
        )}
      </Stack>
    </MessageBubble>
  );
};

/* =========================
   REPLY MESSAGE
========================= */

const ReplyMsg = ({ el }) => {
  const theme = useTheme();

  if (el?.deleted) {
    return <DeletedMsg el={el} />;
  }

  return (
    <MessageBubble el={el}>
      <Typography
        variant="body2"
        sx={{
          color: el.incoming ? theme.palette.text.primary : "#fff",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
        }}
      >
        {el.message}
      </Typography>
    </MessageBubble>
  );
};

/* =========================
   LINK MESSAGE
========================= */

const LinkMsg = ({ el }) => {
  const theme = useTheme();

  if (el?.deleted) {
    return <DeletedMsg el={el} />;
  }

  return (
    <MessageBubble el={el}>
      <Box
        sx={{
          width: 280,
          maxWidth: "100%",
        }}
      >
        <Box
          sx={{
            p: 1.5,
            width: "100%",
            boxSizing: "border-box",
            backgroundColor: theme.palette.background.paper,
            borderRadius: 1.5,
          }}
        >
          {el.preview && (
            <Box
              component="img"
              src={el.preview}
              alt={el.message}
              sx={{
                display: "block",
                width: "100%",
                height: 150,
                objectFit: "cover",
                borderRadius: 1,
              }}
            />
          )}

          <Stack spacing={0.75} mt={el.preview ? 1.5 : 0}>
            <Link
              href={el.message?.startsWith("http") ? el.message : `https://${el.message}`}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{
                color: theme.palette.primary.main,
                fontSize: 14,
                wordBreak: "break-all",
              }}
            >
              {el.message}
            </Link>
          </Stack>
        </Box>
      </Box>
    </MessageBubble>
  );
};

/* =========================
   DOCUMENT MESSAGE
========================= */

const DocMsg = ({ el }) => {
  const theme = useTheme();

  if (el?.deleted) {
    return <DeletedMsg el={el} />;
  }

  const displayDocName =
    el.fileName ||
    (typeof el.file === "string" && !el.file.startsWith("data:")
      ? el.file
      : el.message) ||
    "Document";

  return (
    <MessageBubble el={el}>
      <Stack
        spacing={1}
        sx={{
          width: 280,
          maxWidth: "100%",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{
            p: 1.5,
            width: "100%",
            boxSizing: "border-box",
            backgroundColor: theme.palette.background.paper,
            borderRadius: 1.5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: theme.palette.primary.main,
            }}
          >
            <FileText size={30} weight="duotone" />
          </Box>

          <Typography
            variant="body2"
            sx={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: 600,
              color: theme.palette.text.primary,
            }}
          >
            {displayDocName}
          </Typography>

          {el.file && (
            <IconButton
              component="a"
              href={el.file}
              target="_blank"
              rel="noopener noreferrer"
              download={displayDocName}
              size="small"
              onClick={(e) => e.stopPropagation()}
              sx={{
                flexShrink: 0,
                color: theme.palette.primary.main,
              }}
            >
              <DownloadSimple size={20} weight="bold" />
            </IconButton>
          )}
        </Stack>

        {el.message && el.message !== displayDocName && (
          <Typography
            variant="body2"
            sx={{
              color: el.incoming ? theme.palette.text.primary : "#fff",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            {el.message}
          </Typography>
        )}
      </Stack>
    </MessageBubble>
  );
};

/* =========================
   TIMELINE
========================= */

const Timeline = ({ el }) => {
  const theme = useTheme();

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="center"
      sx={{
        width: "100%",
        my: 1.5,
        userSelect: "none",
      }}
    >
      <Box
        sx={{
          bgcolor:
            theme.palette.mode === "light"
              ? "#ffffff"
              : alpha(theme.palette.background.paper, 0.95),
          color:
            theme.palette.mode === "light"
              ? "#54656f"
              : "rgba(255, 255, 255, 0.85)",
          boxShadow:
            theme.palette.mode === "light"
              ? "0 1px 2px rgba(11, 20, 26, 0.12)"
              : "0 1px 3px rgba(0, 0, 0, 0.4)",
          borderRadius: "8px",
          px: 1.5,
          py: 0.4,
          fontSize: "0.72rem",
          fontWeight: 600,
          letterSpacing: "0.3px",
          textTransform: "uppercase",
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        {el.text}
      </Box>
    </Stack>
  );
};

/* =========================
   EXPORTS
========================= */

export {
  Timeline,
  TextMsg,
  MediaMsg,
  ReplyMsg,
  LinkMsg,
  DocMsg,
};