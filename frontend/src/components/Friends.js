import React from "react";
import {
  Avatar,
  Box,
  Button,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme, styled } from "@mui/material/styles";
import StyledBadge from "./StyledBadge";
import { socket } from "../socket";
import { Chat } from "phosphor-react";

const user_id = window.localStorage.getItem("user_id");

const StyledChatBox = styled(Box)(({ theme }) => ({
  "&:hover": {
    cursor: "pointer",
  },
}));

const UserComponent = ({
  firstName,
  lastName,
  _id,
  online,
  img,
}) => {
  const theme = useTheme();
  const name = `${firstName || ""} ${lastName || ""}`.trim() || "User";

  const handleFollow = () => {
    const user_id = localStorage.getItem("user_id");

    if (!user_id) {
      console.error("User ID not found");
      return;
    }

    if (!socket) {
      console.error("Socket is not connected");
      return;
    }

    socket.emit(
      "friend_request",
      {
        to: _id,
        from: user_id,
      },
      () => {
        alert("Request sent");
      }
    );
  };

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
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          {online ? (
            <StyledBadge
              overlap="circular"
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              variant="dot"
            >
              <Avatar alt={name} src={img} />
            </StyledBadge>
          ) : (
            <Avatar alt={name} src={img} />
          )}

          <Stack spacing={0.3}>
            <Typography variant="subtitle2">
              {name}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            sx={{
              color: "#111",
              backgroundColor: "#fff",
            }}
            onClick={handleFollow}
          >
            Follow
          </Button>
        </Stack>
      </Stack>
    </StyledChatBox>
  );
};

const FriendRequestComponent = ({
  firstName,
  lastName,
  online,
  img,
  id,
}) => {
  const theme = useTheme();
  const name = `${firstName || ""} ${lastName || ""}`.trim() || "User";

  const handleAcceptRequest = () => {
    if (!socket) {
      console.error("Socket is not connected");
      return;
    }

    socket.emit("accept_request", {
      request_id: id,
    });
  };

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
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          {online ? (
            <StyledBadge
              overlap="circular"
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              variant="dot"
            >
              <Avatar alt={name} src={img} />
            </StyledBadge>
          ) : (
            <Avatar alt={name} src={img} />
          )}

          <Stack spacing={0.3}>
            <Typography variant="subtitle2">
              {name}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            sx={{
              color: "#111",
              backgroundColor: "#fff",
            }}
            onClick={handleAcceptRequest}
          >
            Accept Request
          </Button>
        </Stack>
      </Stack>
    </StyledChatBox>
  );
};

const FriendComponent = ({
  firstName,
  lastName,
  _id,
  online,
  status,
  img,
  avatar,
  onChat,
  handleClose,
}) => {
  const theme = useTheme();
  const name = `${firstName || ""} ${lastName || ""}`.trim() || "User";
  const isOnline = online || status === "Online";
  const avatarSrc = img || avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName || "user"}`;

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
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          {isOnline ? (
            <StyledBadge
              overlap="circular"
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              variant="dot"
            >
              <Avatar alt={name} src={avatarSrc} />
            </StyledBadge>
          ) : (
            <Avatar alt={name} src={avatarSrc} />
          )}

          <Stack spacing={0.3}>
            <Typography variant="subtitle2">
              {name}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction={"row"} spacing={2} alignItems={"center"}>
        <IconButton onClick={() => {
          const current_user_id = window.localStorage.getItem("user_id");
          if (!current_user_id) {
            console.error("User ID not found in localStorage");
            return;
          }

          if (!socket.connected) {
            socket.io.opts.query = { user_id: current_user_id };
            socket.connect();
          }

          // start a new conversation
          socket.emit("start_conversation", { to: _id, from: current_user_id });

          if (typeof handleClose === "function") {
            handleClose();
          }
          if (typeof onChat === "function") {
            onChat();
          }
        }}>
          <Chat />
        </IconButton>
        </Stack>
      </Stack>
    </StyledChatBox>
  );
};

export {
  UserComponent,
  FriendRequestComponent,
  FriendComponent,
};
