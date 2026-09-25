import React from "react";
import {
  Box,
  Typography,
  IconButton,
  Stack,
  Tabs,
  Tab,
  Grid,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { CaretLeft } from "phosphor-react";
import { useDispatch } from "react-redux";
import { UpdateSidebarType } from "../redux/slices/app";
import { faker } from "@faker-js/faker";
import { SHARED_LINKS } from "../data";
import { SHARED_DOCS } from "../data";
import { LinkMsg, DocMsg } from "./Conversation/MsgType";
import Message from "./Conversation/Message";

const StarredMessages = () => {
  const theme = useTheme();
  const dispatch = useDispatch();


  const handleBack = () => {
    dispatch(UpdateSidebarType("CONTACT"));
  };

  return (
    <Box
      sx={{
        width: 320,
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <Stack sx={{ height: "100%" }}>

        {/* Header */}
        <Box
          sx={{
            boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
            width: "100%",
            backgroundColor:
              theme.palette.mode === "light"
                ? "#F8FAFF"
                : theme.palette.background.default,
          }}
        >
          <Stack
            sx={{
              p: 2,
            }}
            direction="row"
            alignItems="center"
            spacing={3}
          >
            <IconButton onClick={handleBack}>
              <CaretLeft size={24} />
            </IconButton>

            <Typography variant="subtitle2">
              Starred Messages
            </Typography>
          </Stack>
        </Box>

        {/* Body */}
        <Stack
          sx={{
            flexGrow: 1,
            minHeight: 0,
            overflowY: "auto",
          }}
          p={3}
          spacing={3}
        >
            <Message />
        </Stack>
      </Stack>
    </Box>
  );
};

export default StarredMessages;