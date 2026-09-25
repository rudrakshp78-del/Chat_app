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

const SharedMessages = () => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleBack = () => {
    dispatch(UpdateSidebarType("CONTACT"));
  };

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
          <Tab label="Media" />
          <Tab label="Links" />
          <Tab label="Docs" />
        </Tabs>

        {/* Body */}
        <Stack
          sx={{
            flexGrow: 1,
            minHeight: 0,
            overflowY: "auto",
          }}
          p={3}
          spacing={value === 1 ? 1 : 3}
        >
          {(() => {
            switch (value) {
              // ---------------- MEDIA ----------------
              case 0:
                return (
                  <Grid container spacing={2}>
                    {[0, 1, 2, 3, 4, 5, 6].map((el) => (
                      <Grid item xs={4} key={el}>
                        <img
                          src={faker.image.avatar()}
                          alt={faker.name.fullName()}
                          style={{
                            width: "100%",
                            height: "80px",
                            objectFit: "cover",
                            borderRadius: "8px",
                          }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                );

              // ---------------- LINKS ----------------
              case 1:
                return (
                  <Stack spacing={2}>
                    {SHARED_LINKS.map((el, index) => (
                      <LinkMsg
                        key={index}
                        el={el}
                      />
                    ))}
                  </Stack>
                );

              // ---------------- DOCS ----------------
              case 2:
                return (
                  <Stack spacing={2}>
                    {SHARED_DOCS.map((el, index) => (
                      <DocMsg
                        key={index}
                        el={el}
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