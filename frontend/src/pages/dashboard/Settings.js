import { useTheme } from "@mui/material/styles";
import {
  Stack,
  Box,
  IconButton,
  Typography,
  Avatar,
  Divider,
} from "@mui/material";
import React, { useState } from "react";
import {
  Bell,
  CaretLeft,
  Image,
  Info,
  Key,
  Keyboard,
  Lock,
  Note,
  PencilCircle,
} from "phosphor-react";
import { faker } from "@faker-js/faker";
import Shortcuts from "../../sections/dashboard/settings/Shortcuts";

const Settings = () => {
  const theme = useTheme();

  const [openShortcuts, setOpenShortcuts] = useState(false);

  const handleOpenShortcuts = () => {
    setOpenShortcuts(true);
  };
  const handleCloseShortcuts = () => {
    setOpenShortcuts(false);
  };
  const list = [
    {
      Key: 0,
      icon: <Bell size={20} />,
      title: "Notifications",
      onclick: () => {},
    },
    {
      Key: 1,
      icon: <Lock size={20} />,
      title: "Privacy",
      onclick: () => {},
    },
    {
      Key: 2,
      icon: <Key size={20} />,
      title: "Security",
      onclick: () => {},
    },
    {
      Key: 3,
      icon: <PencilCircle size={20} />,
      title: "Theme",
      // onclick: handleOpenTheme,
      onclick: () => {},
    },
    {
      Key: 4,
      icon: <Image size={20} />,
      title: "Chat Wallpaper",
      onclick: () => {},
    },
    {
      Key: 5,
      icon: <Note size={20} />,
      title: "Request Account Info",
      onclick: () => {},
    },
    {
      Key: 6,
      icon: <Keyboard size={20} />,
      title: "Keyboard Shortcuts",
      onclick: handleOpenShortcuts,
      // onclick: () => {},
    },
    {
      Key: 7,
      icon: <Info size={20} />,
      title: "Help",
      onclick: () => {},
    },
  ];
  return (
    <>
      <Stack direction={"row"} sx={{ width: "100%" }}>
        {/* leftpanel */}
        <Box
          sx={{
            overflowY: "scroll",
            height: "100vh",
            width: 320,
            backgroundColor:
              theme.palette.mode === "light"
                ? "#F8FAFF"
                : theme.palette.background,
            boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
          }}
        >
          <Stack p={4} spacing={5}>
            {/* header */}
            <Stack direction={"row"} alignItems="center" spacing={3}>
              <IconButton>
                <CaretLeft size={24} color={"#4B4B4B"} />
              </IconButton>
              <Typography variant="h6">Settings</Typography>
            </Stack>
            {/* profile */}
            <Stack direction={"row"} spacing={3}>
              <Avatar
                sx={{ width: 56, height: 56 }}
                src={faker.image.avatar()}
                alt={faker.name.fullName}
              />
              <Stack spacing={0.5}>
                <Typography variant="article">{faker.name.fullName}</Typography>
                <Typography variant="article">
                  {faker.random.words()}
                </Typography>
              </Stack>
            </Stack>
            {/* list of options */}
            <Stack spacing={4}>
              {list.map(({ Key, icon, title, onclick }) => (
                <>
                  <Stack
                    spacing={2}
                    sx={{ cursor: "pointer" }}
                    onClick={onclick}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      {icon}

                      <Typography variant="body2">{title}</Typography>
                    </Stack>
                    {Key !== 7 && <Divider />}
                  </Stack>
                </>
              ))}
            </Stack>
          </Stack>
        </Box>
        {/* Rightpanel */}
      </Stack>
      {openShortcuts && (
        <Shortcuts open={openShortcuts} handleClose={handleCloseShortcuts} />
      )}
    </>
  );
};

export default Settings;
