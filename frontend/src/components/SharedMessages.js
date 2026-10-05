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
import { CaretLeft, ImageSquare, LinkSimple, FileText } from "phosphor-react";
import { useDispatch, useSelector } from "react-redux";
import { UpdateSidebarType } from "../redux/slices/app";
import { LinkMsg, DocMsg } from "./Conversation/MsgType";

const SharedMessages = () => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const { current_messages = [] } = useSelector(
    (state) => state.conversation.direct_chat
  );

  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleBack = () => {
    dispatch(UpdateSidebarType("CONTACT"));
  };

  const sharedMedia = React.useMemo(() => {
    return (current_messages || []).filter((m) => {
      const sub = (m?.subtype || "").toLowerCase();
      return (sub === "img" || sub === "media") && (m?.img || m?.file || m?.fileUrl);
    });
  }, [current_messages]);

  const sharedLinks = React.useMemo(() => {
    return (current_messages || []).filter((m) => {
      const sub = (m?.subtype || "").toLowerCase();
      if (sub === "link") return true;
      return typeof m?.message === "string" && /https?:\/\/\S+/i.test(m.message);
    });
  }, [current_messages]);

  const sharedDocs = React.useMemo(() => {
    return (current_messages || []).filter((m) => {
      const sub = (m?.subtype || "").toLowerCase();
      return sub === "doc" || sub === "document";
    });
  }, [current_messages]);

  return (
    <Box
      sx={{
        width: { xs: "100%", md: 320 },
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
              Shared Messages
            </Typography>
          </Stack>
        </Box>

        {/* Tabs */}
        <Tabs
          sx={{ px: 2, pt: 2 }}
          value={value}
          onChange={handleChange}
          centered
        >
          <Tab label={`Media (${sharedMedia.length})`} />
          <Tab label={`Links (${sharedLinks.length})`} />
          <Tab label={`Docs (${sharedDocs.length})`} />
        </Tabs>

        {/* Body */}
        <Stack
          sx={{
            flexGrow: 1,
            minHeight: 0,
            overflowY: "auto",
          }}
          p={3}
          spacing={value === 1 ? 1.5 : 3}
        >
          {(() => {
            switch (value) {
              // ---------------- MEDIA ----------------
              case 0:
                if (sharedMedia.length === 0) {
                  return (
                    <Stack
                      alignItems="center"
                      justifyContent="center"
                      spacing={1}
                      sx={{ py: 6, color: "text.secondary" }}
                    >
                      <ImageSquare size={40} weight="duotone" />
                      <Typography variant="body2">
                        No media shared in this chat yet
                      </Typography>
                    </Stack>
                  );
                }
                return (
                  <Grid container spacing={2}>
                    {sharedMedia.map((el, index) => (
                      <Grid item xs={4} key={el.id || index}>
                        <Box
                          component="a"
                          href={el.img || el.file || el.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ display: "block" }}
                        >
                          <img
                            src={el.img || el.file || el.fileUrl}
                            alt={el.message || "Shared media"}
                            style={{
                              width: "100%",
                              height: "80px",
                              objectFit: "cover",
                              borderRadius: "8px",
                            }}
                          />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                );

              // ---------------- LINKS ----------------
              case 1:
                if (sharedLinks.length === 0) {
                  return (
                    <Stack
                      alignItems="center"
                      justifyContent="center"
                      spacing={1}
                      sx={{ py: 6, color: "text.secondary" }}
                    >
                      <LinkSimple size={40} weight="duotone" />
                      <Typography variant="body2">
                        No links shared in this chat yet
                      </Typography>
                    </Stack>
                  );
                }
                return (
                  <Stack spacing={2}>
                    {sharedLinks.map((el, index) => (
                      <LinkMsg
                        key={el.id || index}
                        el={el}
                        menu={false}
                      />
                    ))}
                  </Stack>
                );

              // ---------------- DOCS ----------------
              case 2:
                if (sharedDocs.length === 0) {
                  return (
                    <Stack
                      alignItems="center"
                      justifyContent="center"
                      spacing={1}
                      sx={{ py: 6, color: "text.secondary" }}
                    >
                      <FileText size={40} weight="duotone" />
                      <Typography variant="body2">
                        No documents shared in this chat yet
                      </Typography>
                    </Stack>
                  );
                }
                return (
                  <Stack spacing={2}>
                    {sharedDocs.map((el, index) => (
                      <DocMsg
                        key={el.id || index}
                        el={el}
                        menu={false}
                      />
                    ))}
                  </Stack>
                );

              default:
                return null;
            }
          })()}
        </Stack>
      </Stack>
    </Box>
  );
};

export default SharedMessages;