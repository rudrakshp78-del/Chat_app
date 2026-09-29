import React from "react";
import {
  Box,
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Menu,
  MenuItem,
  Stack,
  Avatar,
  Typography,
} from "@mui/material";
import { styled, useTheme, alpha } from "@mui/material/styles";
import { useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Trash } from "phosphor-react";
import { SelectConversation, showSnackbar } from "../redux/slices/app";
import {
  SetCurrentConversation,
  DeleteDirectConversation,
} from "../redux/slices/Conversation";
import { socket } from "../socket";
import getAvatarUrl from "../utils/getAvatarUrl";

const truncateText = (string, n) => {
  return string?.length > n ? `${string?.slice(0, n)}...` : string;
};

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

const ChatElement = ({ img, name, msg, time, unread, online, id, user_id, about }) => {
  const dispatch = useDispatch();
  const { room_id } = useSelector((state) => state.app);
  const selectedChatId = room_id?.toString();
  const isSelected = Boolean(selectedChatId && id && selectedChatId === id.toString());
  const authUserId = useSelector((state) => state.auth.user_id);
  const current_user_id = authUserId || window.localStorage.getItem("user_id");

  const [contextMenu, setContextMenu] = React.useState(null);
  const [openDeleteModal, setOpenDeleteModal] = React.useState(false);

  const handleContextMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu(
      contextMenu === null
        ? { mouseX: event.clientX + 2, mouseY: event.clientY - 6 }
        : null
    );
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleDeleteChatClick = (e) => {
    e.stopPropagation();
    handleCloseContextMenu();
    setOpenDeleteModal(true);
  };

  const handleConfirmDelete = (e) => {
    if (e) e.stopPropagation();
    if (!id) return;

    socket.emit("delete_chat", {
      conversation_id: id,
      user_id: current_user_id,
    });

    dispatch(DeleteDirectConversation({ conversation_id: id }));
    if (selectedChatId === id.toString()) {
      dispatch(SelectConversation({ room_id: null }));
    }

    dispatch(
      showSnackbar({
        severity: "success",
        message: "Chat deleted on your device",
      })
    );

    setOpenDeleteModal(false);
  };

  const theme = useTheme();

  return (
    <>
      <StyledChatBox
        onContextMenu={handleContextMenu}
        onClick={() => {
          dispatch(SelectConversation({ room_id: id }));
          dispatch(
            SetCurrentConversation({
              id,
              user_id,
              name,
              online,
              img,
              msg,
              time,
              unread,
              about,
            })
          );
        }}
        sx={{
          width: "100%",

          borderRadius: 1,

          backgroundColor: isSelected
            ? theme.palette.mode === "light"
              ? alpha(theme.palette.primary.main, 0.5)
              : theme.palette.primary.main
            : theme.palette.mode === "light"
            ? "#fff"
            : theme.palette.background.paper,
        }}
        p={2}
      >
        <Stack
          direction="row"
          alignItems={"center"}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={2}>
            {" "}
            {online ? (
              <StyledBadge
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                variant="dot"
              >
                <Avatar
                  alt={name}
                  src={getAvatarUrl(img, name)}
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
                src={getAvatarUrl(img, name)}
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
              <Typography variant="caption">{truncateText(msg, 20)}</Typography>
            </Stack>
          </Stack>
          <Stack spacing={2} alignItems={"center"}>
            <Typography sx={{ fontWeight: 600 }} variant="caption">
              {time}
            </Typography>
            <Badge
              className="unread-count"
              color="primary"
              badgeContent={unread}
            />
          </Stack>
        </Stack>
      </StyledChatBox>

      {/* Right-click Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem
          onClick={handleDeleteChatClick}
          sx={{ color: "error.main", display: "flex", gap: 1 }}
        >
          <Trash size={18} />
          <Typography variant="body2">Delete chat</Typography>
        </MenuItem>
      </Menu>

      {/* Delete Chat Confirmation Dialog */}
      <Dialog
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        maxWidth="xs"
        fullWidth
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>Delete this chat?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this chat with {name}? This chat and
            its messages will be deleted from your device only. The other person
            will still have their chat.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
          >
            Delete chat
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChatElement;