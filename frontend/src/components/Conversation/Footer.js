import React from "react";

import {
  Box,
  Fab,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
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
} from "phosphor-react";

import { styled, useTheme } from "@mui/material/styles";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import useResponsive from "../../hooks/useResponsive";
import { socket } from "../../socket";

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
  const isMobile = useResponsive("between", "md", "xs", "sm");

  const [searchParams] = useSearchParams();

  const [openPicker, setOpenPicker] = React.useState(false);
  const [value, setValue] = React.useState("");

  const { room_id } = useSelector((state) => state.app);
  const { conversations, current_conversation } = useSelector(
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
      type: "Text",
    });

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
      {/* EMOJI PICKER */}
      {openPicker && (
        <Box
          sx={{
            position: "absolute",
            bottom: "100%",
            right: isMobile
              ? 10
              : searchParams.get("open") === "true"
              ? 20
              : 100,

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
        spacing={2}
        sx={{
          p: isMobile ? 1 : 1.5,
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
            width: 48,
            height: 48,
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