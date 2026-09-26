import React from "react";

import {
  Box,
  Fab,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  Camera,
  File,
  Image,
  LinkSimple,
  PaperPlaneTilt,
  Smiley,
  Sticker,
  User,
  X,
} from "phosphor-react";

import { styled, useTheme, alpha } from "@mui/material/styles";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

import { useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import useResponsive from "../../hooks/useResponsive";
import { socket } from "../../socket";
import { ClearReplyingTo } from "../../redux/slices/Conversation";

const StyledInput = styled(TextField)(() => ({
  "& .MuiInputBase-input": {
    paddingTop: "12px !important",
    paddingBottom: "12px !important",
  },
}));

const Actions = [
  {
    color: "#4da5fe",
    icon: <Image size={24} />,
    title: "Photo/Video",
  },
  {
    color: "#1b8cfe",
    icon: <Sticker size={24} />,
    title: "Sticker",
  },
  {
    color: "#0172e4",
    icon: <Camera size={24} />,
    title: "Image",
  },
  {
    color: "#0159b2",
    icon: <File size={24} />,
    title: "Document",
  },
  {
    color: "#013f7f",
    icon: <User size={24} />,
    title: "Contact",
  },
];

const ChatInput = ({ openPicker, setOpenPicker, value, setValue, handleSendMessage }) => {
  const [openActions, setOpenActions] = React.useState(false);

  return (
    <StyledInput
      fullWidth
      placeholder="Write a message..."
      variant="filled"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
        }
      }}
      InputProps={{
        disableUnderline: true,

        startAdornment: (
          <Box
            sx={{
              position: "relative",
              width: 40,
              height: 48,

              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              flexShrink: 0,
            }}
          >
            {openActions && (
              <Stack
                sx={{
                  position: "absolute",
                  bottom: 40,
                  left: 0,
                  zIndex: 100,
                }}
              >
                {Actions.map((el, index) => (
                  <Tooltip
                    key={el.title}
                    placement="right"
                    title={el.title}
                  >
                    <Fab
                      size="small"
                      sx={{
                        position: "absolute",
                        bottom: index * 60,
                        left: 0,

                        width: 40,
                        height: 40,

                        backgroundColor: el.color,

                        "&:hover": {
                          backgroundColor: el.color,
                        },
                      }}
                    >
                      {el.icon}
                    </Fab>
                  </Tooltip>
                ))}
              </Stack>
            )}

            <IconButton
              onClick={() => {
                setOpenActions((prev) => !prev);
              }}
              sx={{
                width: 40,
                height: 40,

                padding: 0,
                margin: 0,

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                "&:hover": {
                  backgroundColor: "transparent",
                },
              }}
            >
              <LinkSimple size={24} />
            </IconButton>
          </Box>
        ),

        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              onClick={() =>
                setOpenPicker((prev) => !prev)
              }
            >
              <Smiley />
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
};

const Footer = () => {
  const theme = useTheme();
  const isMobile = useResponsive("down", "md");

  const [searchParams] = useSearchParams();

  const dispatch = useDispatch();
  const [openPicker, setOpenPicker] = React.useState(false);
  const [value, setValue] = React.useState("");

  const { room_id } = useSelector((state) => state.app);
  const { conversations, current_conversation, replying_to } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { user_id } = useSelector((state) => state.auth);

  const currentChat = (conversations || []).find((c) => c?.id?.toString() === room_id?.toString());
  const to = (currentChat?.user_id || current_conversation?.user_id)?.toString();
  const from = (user_id || window.localStorage.getItem("user_id"))?.toString();

  const handleSendMessage = () => {
    if (!value.trim()) return;
    if (!room_id || !to) {
      console.warn("Cannot send message: missing room_id or recipient", { room_id, to, from });
      return;
    }

    socket.emit("text_message", {
      to,
      from,
      message: value.trim(),
      conversation_id: room_id,
      type: replying_to ? "Reply" : "Text",
      reply: replying_to
        ? replying_to.message || (replying_to.subtype === "img" ? "Photo" : "Attachment")
        : "",
    });

    if (replying_to) {
      dispatch(ClearReplyingTo());
    }

    setValue("");
    setOpenPicker(false);
  };

  return (
    <Box
      sx={{
        width: "100%",
        flexShrink: 0,

        backgroundColor:
          theme.palette.mode === "light"
            ? "#F8FAFF"
            : theme.palette.background.paper,

        boxShadow:
          "0px 0px 2px rgba(0, 0, 0, 0.25)",

        position: "relative",
      }}
    >
      {/* REPLY PREVIEW BAR */}
      {replying_to && (
        <Box
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: 1,
            backgroundColor:
              theme.palette.mode === "light"
                ? alpha(theme.palette.primary.main, 0.08)
                : alpha(theme.palette.primary.main, 0.16),
            borderTop: `1px solid ${theme.palette.divider}`,
            borderLeft: `4px solid ${theme.palette.primary.main}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ minWidth: 0, flexGrow: 1, pr: 1 }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, color: theme.palette.primary.main, display: "block" }}
            >
              Replying to {replying_to.incoming ? (current_conversation?.name || "User") : "yourself"}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "0.85rem",
              }}
            >
              {replying_to.message || (replying_to.subtype === "img" ? "Photo" : "Attachment")}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => dispatch(ClearReplyingTo())}>
            <X size={16} />
          </IconButton>
        </Box>
      )}

      {/* EMOJI PICKER */}
      {openPicker && (
        <Box
          sx={{
            position: "absolute",
            bottom: "100%",
            right: isMobile
              ? 8
              : searchParams.get("open") === "true"
              ? 20
              : 100,
            maxWidth: "calc(100vw - 16px)",
            zIndex: 1000,
          }}
        >
          <Picker
            theme={theme.palette.mode}
            data={data}
            onEmojiSelect={(emoji) => {
              setValue((prev) => prev + (emoji.native || ""));
            }}
          />
        </Box>
      )}

      {/* FOOTER */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={{ xs: 1, sm: 2 }}
        sx={{
          p: { xs: 1, sm: 1.5 },
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <ChatInput
            openPicker={openPicker}
            setOpenPicker={setOpenPicker}
            value={value}
            setValue={setValue}
            handleSendMessage={handleSendMessage}
          />
        </Box>

        <Box
          sx={{
            width: { xs: 44, sm: 48 },
            height: { xs: 44, sm: 48 },
            flexShrink: 0,
            backgroundColor: theme.palette.primary.main,
            borderRadius: 1.5,
          }}
        >
          <Stack
            sx={{
              width: "100%",
              height: "100%",
            }}
            alignItems="center"
            justifyContent="center"
          >
            <IconButton onClick={handleSendMessage}>
              <PaperPlaneTilt color="#fff" />
            </IconButton>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};

export default Footer;