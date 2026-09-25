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

import { useTheme, styled } from "@mui/material/styles";

import { useSearchParams } from "react-router-dom";
import useResponsive from "../../hooks/useResponsive";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

/* =========================================================
   STYLED INPUT
========================================================= */

const StyledInput = styled(TextField)(() => ({
  width: "100%",

  /* Main input container */
  "& .MuiFilledInput-root": {
    minHeight: 48,
    padding: 0,

    display: "flex",
    alignItems: "center",

    boxSizing: "border-box",
  },

  /* Input text */
  "& .MuiInputBase-input": {
    paddingTop: "12px !important",
    paddingBottom: "12px !important",
    paddingLeft: "4px !important",
    paddingRight: "4px !important",

    boxSizing: "border-box",
  },

  /* Both left and right adornments */
  "& .MuiInputAdornment-root": {
    width: 40,
    height: 48,

    margin: 0,

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    flexShrink: 0,
  },

  /* Left adornment */
  "& .MuiInputAdornment-positionStart": {
    marginLeft: 0,
    marginRight: 0,
  },

  /* Right adornment */
  "& .MuiInputAdornment-positionEnd": {
    marginLeft: 0,
    marginRight: 0,
  },

  /* Remove default MUI padding */
  "& .MuiFilledInput-input": {
    boxSizing: "border-box",
  },
}));

/* =========================================================
   ATTACHMENT ACTIONS
========================================================= */

const Actions = [
  {
    color: "#4da5fe",
    icon: <Image size={24} />,
    y: 60,
    title: "Photo/Video",
  },
  {
    color: "#1b8cfe",
    icon: <Sticker size={24} />,
    y: 120,
    title: "Stickers",
  },
  {
    color: "#0172e4",
    icon: <Camera size={24} />,
    y: 180,
    title: "Image",
  },
  {
    color: "#0159b2",
    icon: <File size={24} />,
    y: 240,
    title: "Document",
  },
  {
    color: "#013f7f",
    icon: <User size={24} />,
    y: 300,
    title: "Contact",
  },
];

/* =========================================================
   CHAT INPUT
========================================================= */

const ChatInput = ({ openPicker, setOpenPicker }) => {
  const [openActions, setOpenActions] = React.useState(false);

  return (
    <StyledInput
      fullWidth
      placeholder="Write a message..."
      variant="filled"
      InputProps={{
        disableUnderline: true,

        /* =====================================================
           LEFT LINK / ATTACHMENT BUTTON
        ===================================================== */

        startAdornment: (
          <InputAdornment
            position="start"
            sx={{
              position: "relative",
            }}
          >
            {/* ===============================================
                FLOATING ATTACHMENT ACTIONS
            =============================================== */}

            {openActions && (
              <Stack
                sx={{
                  position: "absolute",

                  bottom: 40,
                  left: 0,

                  width: 40,
                  height: 40,

                  zIndex: 9999,
                }}
              >
                {Actions.map((el) => (
                  <Tooltip key={el.title} placement="right" title={el.title}>
                    <Fab
                      size="small"
                      sx={{
                        position: "absolute",

                        bottom: el.y,
                        left: 0,

                        width: 40,
                        height: 40,

                        minHeight: 40,

                        backgroundColor: el.color,
                        color: "#fff",

                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",

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

            {/* ===============================================
                LINK BUTTON
            =============================================== */}

            <IconButton
              onClick={() => {
                setOpenActions((prev) => !prev);

                /* Close emoji picker when attachment opens */
                if (!openActions) {
                  setOpenPicker(false);
                }
              }}
              sx={{
                width: 40,
                height: 40,

                minWidth: 40,
                minHeight: 40,

                padding: 0,
                margin: 0,

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                color: "inherit",

                flexShrink: 0,

                "&:hover": {
                  backgroundColor: "transparent",
                },
              }}
            >
              <LinkSimple size={24} />
            </IconButton>
          </InputAdornment>
        ),

        /* =====================================================
           RIGHT EMOJI BUTTON
        ===================================================== */

        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              onClick={() => {
                setOpenPicker((prev) => !prev);

                /* Close attachment actions when emoji opens */
                if (!openPicker) {
                  setOpenActions(false);
                }
              }}
              sx={{
                width: 40,
                height: 40,

                minWidth: 40,
                minHeight: 40,

                padding: 0,
                margin: 0,

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                color: "inherit",

                flexShrink: 0,

                "&:hover": {
                  backgroundColor: "transparent",
                },
              }}
            >
              <Smiley size={24} />
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
};

/* =========================================================
   FOOTER
========================================================= */

const Footer = () => {
  const theme = useTheme();

  const isMobile = useResponsive("between", "md", "xs", "sm");

  const [searchParams] = useSearchParams();

  const [openPicker, setOpenPicker] = React.useState(false);

  return (
    <Box
      sx={{
        width: "100%",

        flexShrink: 0,

        position: "relative",
      }}
    >
      {/* =====================================================
          EMOJI PICKER
      ===================================================== */}

      {openPicker && (
        <Box
          sx={{
            position: "fixed",

            zIndex: 1000,

            bottom: 80,

            right: isMobile
              ? 20
              : searchParams.get("open") === "true"
                ? 420
                : 100,
          }}
        >
          <Picker
            theme={theme.palette.mode}
            data={data}
            onEmojiSelect={(emoji) => {
              console.log(emoji);
            }}
          />
        </Box>
      )}

      {/* =====================================================
          FOOTER CONTAINER
      ===================================================== */}

      <Box
        p={isMobile ? 1 : 2}
        sx={{
          width: "100%",

          boxSizing: "border-box",

          backgroundColor:
            theme.palette.mode === "light"
              ? "#F8FAFF"
              : theme.palette.background.paper,

          boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={isMobile ? 1 : 2}
          sx={{
            width: "100%",
          }}
        >
          {/* =================================================
              MESSAGE INPUT
          ================================================= */}

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <ChatInput openPicker={openPicker} setOpenPicker={setOpenPicker} />
          </Box>

          {/* =================================================
              SEND BUTTON
          ================================================= */}

          <Box
            sx={{
              width: 48,
              height: 48,

              minWidth: 48,

              flexShrink: 0,

              backgroundColor: theme.palette.primary.main,

              borderRadius: 1.5,

              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconButton
              sx={{
                width: "100%",
                height: "100%",

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
              <PaperPlaneTilt size={22} color="#ffffff" />
            </IconButton>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

export default Footer;
