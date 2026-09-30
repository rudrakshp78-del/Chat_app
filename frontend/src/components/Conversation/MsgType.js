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
  Image,
  Prohibit,
  Smiley,
  Star,
  Trash,
  WarningOctagon,
} from "phosphor-react";

import { fMessageTime } from "../../utils/formatTime";
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

const MessageOptions = ({ el }) => {
  const dispatch = useDispatch();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [reactionAnchorEl, setReactionAnchorEl] = React.useState(null);
  const [openForward, setOpenForward] = React.useState(false);
  const [openReport, setOpenReport] = React.useState(false);
  const [openDelete, setOpenDelete] = React.useState(false);

  const { room_id } = useSelector((state) => state.app);

  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action) => {
    const currentAnchor = anchorEl;
    handleClose();

    switch (action) {
      case "reply":
        dispatch(SetReplyingTo(el));
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
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            minWidth: 170,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          },
        }}
      >
        {!el?.deleted ? (
          <>
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

const MessageBubble = ({ el, children }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { room_id } = useSelector((state) => state.app);

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

  return (
    <Stack
      direction="row"
      justifyContent={el.incoming ? "flex-start" : "flex-end"}
      sx={{
        width: "100%",
        position: "relative",
        mb: el.reaction ? 1.5 : 0.5,
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "fit-content",
          maxWidth: { xs: "82%", sm: "75%" },
          flexShrink: 0,
          p: 1.5,
          borderRadius: 1.5,
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
          <MessageOptions el={el} />
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

  if (el?.deleted) {
    return <DeletedMsg el={el} />;
  }

  return (
    <MessageBubble el={el}>
      <Stack spacing={1}>
        <Box
          component="img"
          src={el.img || el.file}
          alt={el.message}
          sx={{
            display: "block",
            width: "100%",
            maxWidth: 280,
            height: "auto",
            maxHeight: 200,
            objectFit: "cover",
            borderRadius: 1.5,
          }}
        />

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
            }}
          >
            <Image size={32} />
          </Box>

          <Typography
            variant="body2"
            sx={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: theme.palette.text.primary,
            }}
          >
            {el.file || "Attachment"}
          </Typography>

          {el.file && (
            <IconButton
              component="a"
              href={el.file}
              target="_blank"
              download
              size="small"
              sx={{
                flexShrink: 0,
                color: theme.palette.text.primary,
              }}
            >
              <DownloadSimple size={20} />
            </IconButton>
          )}
        </Stack>

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