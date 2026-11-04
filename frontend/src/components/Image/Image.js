import React from "react";
import {
  Box,
  Badge,
  Stack,
  Avatar,
  Typography,
  IconButton,
  Button,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import { Chat, Check } from "phosphor-react";
import { isFriendRequestSent,
  isFriendRequestAccepted,
  setFriendRequestAccepted, setFriendRequestSent } from "../../utils/chatSettingsHelpers";
import { socket } from "../socket";

const user_id = window.localStorage.getItem("user_id");

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

const UserElement = ({ img, firstName, lastName, online, _id }) => {
  const theme = useTheme();

  const currentUserId = window.localStorage.getItem("user_id");
  const name = `${firstName || ""} ${lastName || ""}`.trim() || "User";

  const [isSent, setIsSent] = React.useState(() =>
    isFriendRequestSent(_id, currentUserId)
  );

  React.useEffect(() => {
    const handleUpdate = () => {
      setIsSent(isFriendRequestSent(_id, currentUserId));
    };
    window.addEventListener("sent_friend_requests_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("sent_friend_requests_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [_id, currentUserId]);

  const handleToggleRequest = (e) => {
    e.stopPropagation();
    const uid = window.localStorage.getItem("user_id");
    if (!uid) {
      console.error("User ID not found in localStorage");
      return;
    }

    if (isSent) {
      setFriendRequestSent(_id, false, uid);
      setIsSent(false);
    } else {
      setFriendRequestSent(_id, true, uid);
      setIsSent(true);

      socket.emit("friend_request", { to: _id, from: uid });
    }
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
        alignItems={"center"}
        justifyContent="space-between"
      >
        <Stack direction="row" alignItems={"center"} spacing={2}>
          {online ? (
            <StyledBadge
              overlap="circular"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              variant="dot"
            >
              <Avatar alt={name} src={img} />
            </StyledBadge>
          ) : (
            <Avatar alt={name} src={img} />
          )}
          <Stack spacing={0.3}>
            <Typography variant="subtitle2">{name}</Typography>
          </Stack>
        </Stack>
        <Stack direction={"row"} spacing={2} alignItems={"center"}>
          <Button
            variant="contained"
            size="small"
            onClick={handleToggleRequest}
            startIcon={isSent ? <Check size={16} weight="bold" /> : undefined}
            sx={{
              minWidth: 78,
              px: 2,
              py: 0.65,
              borderRadius: 1.5,
              fontWeight: 600,
              fontSize: "0.825rem",
              textTransform: "none",
              bgcolor: isSent ? "#00A884" : theme.palette.primary.main,
              color: "#ffffff",
              boxShadow: isSent
                ? "0 3px 8px rgba(0, 168, 132, 0.35)"
                : "0 3px 8px rgba(1, 98, 196, 0.25)",
              border: isSent
                ? "1px solid #008f6f"
                : `1px solid ${theme.palette.primary.main}`,
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                bgcolor: isSent ? "#008f6f" : theme.palette.primary.dark,
                boxShadow: isSent
                  ? "0 4px 12px rgba(0, 168, 132, 0.45)"
                  : "0 4px 12px rgba(1, 98, 196, 0.35)",
              },
            }}
          >
            {isSent ? "Added" : "Add"}
          </Button>
        </Stack>
      </Stack>
    </StyledChatBox>
  );
};

const FriendRequestElement = ({
  img,
  firstName,
  lastName,
  incoming,
  missed,
  online,
  id,
}) => {
  const theme = useTheme();

  const currentUserId = window.localStorage.getItem("user_id");
  const name = `${firstName || ""} ${lastName || ""}`.trim() || "User";

  const [isAccepted, setIsAccepted] = React.useState(() =>
    isFriendRequestAccepted(id, currentUserId)
  );

  React.useEffect(() => {
    const handleUpdate = () => {
      setIsAccepted(isFriendRequestAccepted(id, currentUserId));
    };
    window.addEventListener("accepted_friend_requests_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("accepted_friend_requests_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [id, currentUserId]);

  const handleAccept = (e) => {
    e.stopPropagation();
    if (isAccepted) return;

    const uid = window.localStorage.getItem("user_id");
    setFriendRequestAccepted(id, true, uid);
    setIsAccepted(true);

    socket.emit("accept_request", { request_id: id });
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
        alignItems={"center"}
        justifyContent="space-between"
      >
        <Stack direction="row" alignItems={"center"} spacing={2}>
          {online ? (
            <StyledBadge
              overlap="circular"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              variant="dot"
            >
              <Avatar alt={name} src={img} />
            </StyledBadge>
          ) : (
            <Avatar alt={name} src={img} />
          )}
          <Stack spacing={0.3}>
            <Typography variant="subtitle2">{name}</Typography>
          </Stack>
        </Stack>
        <Stack direction={"row"} spacing={2} alignItems={"center"}>
          <Button
            variant="contained"
            size="small"
            onClick={handleAccept}
            startIcon={isAccepted ? <Check size={16} weight="bold" /> : undefined}
            sx={{
              minWidth: 88,
              px: 2,
              py: 0.65,
              borderRadius: 1.5,
              fontWeight: 600,
              fontSize: "0.825rem",
              textTransform: "none",
              bgcolor: isAccepted ? "#00A884" : theme.palette.primary.main,
              color: "#ffffff",
              boxShadow: isAccepted
                ? "0 3px 8px rgba(0, 168, 132, 0.35)"
                : "0 3px 8px rgba(1, 98, 196, 0.25)",
              border: isAccepted
                ? "1px solid #008f6f"
                : `1px solid ${theme.palette.primary.main}`,
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                bgcolor: isAccepted ? "#008f6f" : theme.palette.primary.dark,
                boxShadow: isAccepted
                  ? "0 4px 12px rgba(0, 168, 132, 0.45)"
                  : "0 4px 12px rgba(1, 98, 196, 0.35)",
              },
            }}
          >
            {isAccepted ? "Accepted" : "Accept"}
          </Button>
        </Stack>
      </Stack>
    </StyledChatBox>
  );
};

// FriendElement

const FriendElement = ({
  img,
  firstName,
  lastName,
  incoming,
  missed,
  online,
  _id,
}) => {
  const theme = useTheme();

  const name = `${firstName} ${lastName}`;

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
        <Stack direction="row" alignItems={"center"} spacing={2}>
          {" "}
          {online ? (
            <StyledBadge
              overlap="circular"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              variant="dot"
            >
              <Avatar alt={name} src={img} />
            </StyledBadge>
          ) : (
            <Avatar alt={name} src={img} />
          )}
          <Stack spacing={0.3}>
            <Typography variant="subtitle2">{name}</Typography>
          </Stack>
        </Stack>
        <Stack direction={"row"} spacing={2} alignItems={"center"}>
          <IconButton
            onClick={() => {
              // start a new conversation
              socket.emit("start_conversation", { to: _id, from: user_id });
            }}
          >
            <Chat />
          </IconButton>
        </Stack>
      </Stack>
    </StyledChatBox>
  );
};

export { UserElement, FriendRequestElement, FriendElement };