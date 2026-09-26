import React from "react";
import {
  Box,
  Badge,
  Stack,
  Avatar,
  Typography,
  IconButton,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import {
  ArrowDownLeft,
  ArrowUpRight,
  VideoCamera,
  Phone,
} from "phosphor-react";
import { useDispatch } from "react-redux";
import { StartAudioCall } from "../redux/slices/audioCall";
import { StartVideoCall } from "../redux/slices/videoCall";
import getAvatarUrl from "../utils/getAvatarUrl";

const StyledChatBox = styled(Box)(({ theme }) => ({
  "&:hover": {
    cursor: "pointer",
  },
}));

const StyledBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: "#44b700",
    color: "#44b700",
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    "&::after": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      animation: "ripple 1.2s infinite ease-in-out",
      border: "1px solid currentColor",
      content: '""',
    },
  },
  "@keyframes ripple": {
    "0%": {
      transform: "scale(.8)",
      opacity: 1,
    },
    "100%": {
      transform: "scale(2.4)",
      opacity: 0,
    },
  },
}));

const CallLogElement = ({ img, name, incoming, missed, online, id }) => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const avatarSrc = getAvatarUrl(img, name);

  return (
    <StyledChatBox
      sx={{
        width: "100%",
        borderRadius: 1,
        backgroundColor: theme.palette.background.paper,
      }}
      p={2}
    >
      <Stack
        direction="row"
        alignItems={"center"}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={2} alignItems="center">
          {online ? (
            <StyledBadge
              overlap="circular"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              variant="dot"
            >
              <Avatar
                alt={name}
                src={avatarSrc}
                imgProps={{
                  onError: (e) => {
                    e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                      name || "User"
                    )}`;
                  },
                }}
              >
                {(name || "U")[0]}
              </Avatar>
            </StyledBadge>
          ) : (
            <Avatar
              alt={name}
              src={avatarSrc}
              imgProps={{
                onError: (e) => {
                  e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                    name || "User"
                  )}`;
                },
              }}
            >
              {(name || "U")[0]}
            </Avatar>
          )}
          <Stack spacing={0.3}>
            <Typography variant="subtitle2">{name}</Typography>
            <Stack spacing={1} alignItems="center" direction={"row"}>
              {incoming ? (
                <ArrowDownLeft color={missed ? "red" : "green"} />
              ) : (
                <ArrowUpRight color={missed ? "red" : "green"} />
              )}
              <Typography variant="caption">Yesterday 21:24</Typography>
            </Stack>
          </Stack>
        </Stack>
        <Stack direction={"row"} spacing={1} alignItems={"center"}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              if (id !== undefined && id !== null) dispatch(StartAudioCall(id));
            }}
          >
            <Phone size={20} style={{ color: theme.palette.primary.main }} />
          </IconButton>

          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              if (id !== undefined && id !== null) dispatch(StartVideoCall(id));
            }}
          >
            <VideoCamera size={20} style={{ color: theme.palette.primary.main }} />
          </IconButton>
        </Stack>
      </Stack>
    </StyledChatBox>
  );
};

const CallElement = ({ img, name, id, handleClose }) => {
  const dispatch = useDispatch();
  const theme = useTheme();

  const avatarSrc = getAvatarUrl(img, name);

  return (
    <StyledChatBox
      sx={{
        width: "100%",
        borderRadius: 1,
        backgroundColor: theme.palette.background.paper,
      }}
      p={2}
    >
      <Stack
        direction="row"
        alignItems={"center"}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            alt={name}
            src={avatarSrc}
            imgProps={{
              onError: (e) => {
                e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                  name || "User"
                )}`;
              },
            }}
          >
            {(name || "U")[0]}
          </Avatar>
          <Stack spacing={0.3} alignItems="center" direction={"row"}>
            <Typography variant="subtitle2">{name}</Typography>
          </Stack>
        </Stack>
        <Stack direction={"row"} spacing={2} alignItems={"center"}>
          <IconButton
            onClick={() => {
              if (id !== undefined && id !== null) dispatch(StartAudioCall(id));
              if (typeof handleClose === "function") handleClose();
            }}
          >
            <Phone style={{ color: theme.palette.primary.main }} />
          </IconButton>

          <IconButton
            onClick={() => {
              if (id !== undefined && id !== null) dispatch(StartVideoCall(id));
              if (typeof handleClose === "function") handleClose();
            }}
          >
            <VideoCamera style={{ color: theme.palette.primary.main }} />
          </IconButton>
        </Stack>
      </Stack>
    </StyledChatBox>
  );
};

export { CallLogElement, CallElement };