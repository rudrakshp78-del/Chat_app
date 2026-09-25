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
import { useTheme } from "@mui/material/styles";
import {
  DotsThreeVertical,
  DownloadSimple,
  Image,
} from "phosphor-react";

import { Message_options } from "../../data";

/* =========================
   MESSAGE OPTIONS
========================= */

const MessageOptions = () => {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={handleClick}
        sx={{
          p: 0.5,
        }}
      >
        <DotsThreeVertical size={18} />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        {Message_options.map((item) => (
          <MenuItem
            key={item.title}
            onClick={handleClose}
          >
            {item.title}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

/* =========================
   MESSAGE BUBBLE
========================= */

const MessageBubble = ({ el, children }) => {
  const theme = useTheme();

  return (
    <Stack
      direction="row"
      justifyContent={el.incoming ? "flex-start" : "flex-end"}
      sx={{
        width: "100%",
      }}
    >
      <Box
        sx={{
          position: "relative",

          // Let the content determine the width
          width: "fit-content",

          // Don't let it become too large
          maxWidth: "75%",

          // Prevent flexbox from shrinking it
          flexShrink: 0,

          p: 1.5,
          borderRadius: 1.5,

          backgroundColor: el.incoming
            ? theme.palette.background.default
            : theme.palette.primary.main,
        }}
      >
        {children}

        {/* Three dots */}
        <Box
          sx={{
            position: "absolute",
            top: -18,
            ...(el.incoming
              ? {
                  right: -28,
                }
              : {
                  left: -28,
                }),
            zIndex: 10,
          }}
        >
          <MessageOptions />
        </Box>
      </Box>
    </Stack>
  );
};

/* =========================
   TEXT MESSAGE
========================= */

const TextMsg = ({ el }) => {
  const theme = useTheme();

  return (
    <MessageBubble el={el}>
      <Typography
        variant="body2"
        sx={{
          color: el.incoming
            ? theme.palette.text.primary
            : "#fff",

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

  return (
    <MessageBubble el={el}>
      <Stack spacing={1}>
        <Box
  component="img"
  src={el.img}
  alt={el.message}
  sx={{
    display: "block",
    width: 280,
    maxWidth: "100%",
    height: 180,
    objectFit: "cover",
    borderRadius: 1.5,
  }}
/>

        <Typography
          variant="body2"
          sx={{
            color: el.incoming
              ? theme.palette.text.primary
              : "#fff",
          }}
        >
          {el.message}
        </Typography>
      </Stack>
    </MessageBubble>
  );
};

/* =========================
   REPLY MESSAGE
========================= */

const ReplyMsg = ({ el }) => {
  const theme = useTheme();

  return (
    <MessageBubble el={el}>
      <Stack spacing={2}>
        <Box
          sx={{
            p: 2,
            backgroundColor: theme.palette.background.paper,
            borderRadius: 1,
          }}
        >
          <Typography
            variant="body2"
            color={theme.palette.text.primary}
          >
            {el.message}
          </Typography>
        </Box>

        <Typography
          variant="body2"
          sx={{
            color: el.incoming
              ? theme.palette.text.primary
              : "#fff",
          }}
        >
          {el.reply}
        </Typography>
      </Stack>
    </MessageBubble>
  );
};

/* =========================
   LINK MESSAGE
========================= */

const LinkMsg = ({ el }) => {
  const theme = useTheme();

  return (
    <MessageBubble el={el}>
      <Box
        sx={{
          width: 280,
          maxWidth: "100%",
        }}
      >
        {/* Link preview card */}
        <Box
          sx={{
            p: 1.5,
            width: "100%",
            boxSizing: "border-box",
            backgroundColor: theme.palette.background.paper,
            borderRadius: 1.5,
          }}
        >
          {/* Preview image */}
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

          {/* Link information */}
          <Stack spacing={0.75} mt={1.5}>
            <Typography
              variant="subtitle2"
              sx={{
                color: theme.palette.text.primary,
                fontWeight: 600,
              }}
            >
              Creating a chat app
            </Typography>

            <Link
              href="https://www.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{
                color: theme.palette.primary.main,
                fontSize: 14,
                wordBreak: "break-all",
              }}
            >
              www.youtube.com
            </Link>

            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.primary,
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              {el.message}
            </Typography>
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

  return (
    <MessageBubble el={el}>
      <Stack
        spacing={1}
        sx={{
          width: 280,
          maxWidth: "100%",
        }}
      >
        {/* Document card */}
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
          {/* File icon */}
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

          {/* File name */}
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
            Abstract.png
          </Typography>

          {/* Download */}
          <IconButton
            size="small"
            sx={{
              flexShrink: 0,
              color: theme.palette.text.primary,
            }}
          >
            <DownloadSimple size={20} />
          </IconButton>
        </Stack>

        {/* Message */}
        <Typography
          variant="body2"
          sx={{
            color: el.incoming
              ? theme.palette.text.primary
              : "#fff",
            wordBreak: "break-word",
            overflowWrap: "anywhere",
          }}
        >
          {el.message}
        </Typography>
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
      spacing={2}
      sx={{
        width: "100%",
      }}
    >
      <Divider sx={{ flex: 1 }} />

      <Typography
        variant="caption"
        sx={{
          color: theme.palette.text.secondary,
          whiteSpace: "nowrap",
        }}
      >
        {el.text}
      </Typography>

      <Divider sx={{ flex: 1 }} />
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