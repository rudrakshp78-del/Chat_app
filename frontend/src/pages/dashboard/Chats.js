import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Divider,
  Button,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  ArchiveBox,
  CircleDashed,
  MagnifyingGlass,
  Users,
} from "phosphor-react";

import { SimpleBarStyle } from "../../components/Scrollbar";
import {
  Search,
  SearchIconWrapper,
  StyledInputBase,
} from "../../components/Search";
import ChatElement from "../../components/ChatElement";
import Friends from "../../sections/dashboard/Friends";

import { socket } from "../../socket";
import { useDispatch, useSelector } from "react-redux";
import { FetchDirectConversations } from "../../redux/slices/Conversation";

const Chats = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const theme = useTheme();

  const dispatch = useDispatch();

  const { conversations } = useSelector(
    (state) => state.conversation.direct_chat
  );

  useEffect(() => {
    const user_id = window.localStorage.getItem("user_id");

    if (!user_id) {
      console.log("❌ No user_id found");
      return;
    }

    console.log("User ID:", user_id);

    // Set user_id for Socket.IO connection
    socket.io.opts.query = {
      user_id,
    };

    const handleConnect = () => {
      console.log("✅ SOCKET CONNECTED:", socket.id);

      socket.emit(
        "get_direct_conversations",
        { user_id },
        (data) => {
          console.log("📩 DIRECT CONVERSATIONS:", data);

          dispatch(
            FetchDirectConversations({
              conversations: data,
            })
          );
        }
      );
    };

    socket.on("connect", handleConnect);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
    };
  }, [dispatch]);

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  return (
    <>
      <Box
        sx={{
          position: "relative",
          width: 320,
          minWidth: 320,
          height: "100%",
          backgroundColor:
            theme.palette.mode === "light"
              ? "#F8FAFF"
              : theme.palette.background.paper,
          boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
        }}
      >
        <Stack
          p={3}
          spacing={2}
          sx={{
            height: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* HEADER */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="h5">Chats</Typography>

            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton onClick={handleOpenDialog}>
                <Users />
              </IconButton>

              <IconButton>
                <CircleDashed />
              </IconButton>
            </Stack>
          </Stack>

          {/* SEARCH */}
          <Stack sx={{ width: "100%" }}>
            <Search>
              <SearchIconWrapper>
                <MagnifyingGlass color="#709CE6" />
              </SearchIconWrapper>

              <StyledInputBase
                placeholder="Search..."
                inputProps={{
                  "aria-label": "search",
                }}
              />
            </Search>
          </Stack>

          {/* ARCHIVE */}
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <ArchiveBox size={24} />
              <Button>Archive</Button>
            </Stack>

            <Divider />
          </Stack>

          {/* CHAT LIST */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            <SimpleBarStyle timeout={500} clickOnTrack={false}>
              <Stack spacing={2.4}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: "#676767",
                    marginTop: 2,
                  }}
                >
                  All Chats
                </Typography>

                {conversations
                  .filter((el) => !el.pinned)
                  .map((el) => (
                    <ChatElement key={el.id} {...el} />
                  ))}
              </Stack>
            </SimpleBarStyle>
          </Box>
        </Stack>
      </Box>

      {openDialog && (
        <Friends
          open={openDialog}
          handleClose={handleCloseDialog}
        />
      )}
    </>
  );
};

export default Chats;