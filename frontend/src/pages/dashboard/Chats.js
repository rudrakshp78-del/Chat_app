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
import StatusAvatar from "../../components/Status/StatusAvatar";
import NotificationBanner from "../../components/NotificationBanner";

import { socket } from "../../socket";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FetchDirectConversations } from "../../redux/slices/Conversation";
import { FetchAllStatuses } from "../../redux/slices/status";
import {
  isFriendPinned,
  getFriendNickname,
} from "../../utils/chatSettingsHelpers";

const Chats = () => {
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [, setFriendshipTick] = useState(0);
  const theme = useTheme();

  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.app);
  const { conversations } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { myStatuses, otherStatuses } = useSelector((state) => state.status);

  const [showArchived, setShowArchived] = useState(false);
  const [archivedIds, setArchivedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("trackon_archived_chats") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const syncArchived = () => {
      try {
        setArchivedIds(
          JSON.parse(localStorage.getItem("trackon_archived_chats") || "[]")
        );
      } catch {
        setArchivedIds([]);
      }
    };
    const syncFriendship = () => {
      setFriendshipTick((t) => t + 1);
    };
    window.addEventListener("archived_chats_updated", syncArchived);
    window.addEventListener("friendship_updated", syncFriendship);
    return () => {
      window.removeEventListener("archived_chats_updated", syncArchived);
      window.removeEventListener("friendship_updated", syncFriendship);
    };
  }, []);

  useEffect(() => {
    dispatch(FetchAllStatuses());
  }, [dispatch]);

  const authUserId = useSelector((state) => state.auth.user_id);

  useEffect(() => {
    const user_id = authUserId || window.localStorage.getItem("user_id");

    if (!user_id) {
      return;
    }

    let received = false;
    const retryTimers = [];

    const clearRetries = () => {
      while (retryTimers.length > 0) {
        clearTimeout(retryTimers.pop());
      }
    };

    const handleConversationsData = (data) => {
      if (!Array.isArray(data)) return;
      received = true;
      clearRetries();
      dispatch(
        FetchDirectConversations({
          conversations: data,
        })
      );
    };

    const requestConversations = () => {
      if (!socket.connected) return;
      socket.emit("get_direct_conversations", { user_id }, (data) => {
        handleConversationsData(data);
      });
    };

    const scheduleFetchWithRetry = () => {
      received = false;
      clearRetries();
      requestConversations();
      // Fast automatic retries in case server was still initializing connection listeners
      [350, 900, 2200].forEach((delay) => {
        const timer = setTimeout(() => {
          if (!received && socket.connected) {
            requestConversations();
          }
        }, delay);
        retryTimers.push(timer);
      });
    };

    // Set user_id for Socket.IO connection
    socket.io.opts.query = {
      user_id,
    };

    socket.on("connect", scheduleFetchWithRetry);
    socket.on("direct_conversations", handleConversationsData);

    if (!socket.connected) {
      socket.connect();
    } else {
      scheduleFetchWithRetry();
    }

    return () => {
      clearRetries();
      socket.off("connect", scheduleFetchWithRetry);
      socket.off("direct_conversations", handleConversationsData);
    };
  }, [dispatch, authUserId]);

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
          width: "100%",
          height: "100%",
          backgroundColor:
            theme.palette.mode === "light"
              ? "#F8FAFF"
              : theme.palette.background.paper,
          boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
        }}
      >
        <Stack
          p={{ xs: 2, sm: 3 }}
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

              <IconButton onClick={() => navigate("/status")}>
                <CircleDashed />
              </IconButton>
            </Stack>
          </Stack>

          {/* DESKTOP NOTIFICATION PROMPT (WhatsApp Style) */}
          <NotificationBanner />

          {/* SEARCH */}
          <Stack sx={{ width: "100%" }}>
            <Search>
              <SearchIconWrapper>
                <MagnifyingGlass color="#709CE6" />
              </SearchIconWrapper>

              <StyledInputBase
                placeholder="Search chats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                inputProps={{
                  "aria-label": "search",
                }}
              />
            </Search>
          </Stack>

          {/* WHATSAPP STATUS TRAY */}
          <Box sx={{ width: "100%", pt: 0.5, pb: 0.5 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.75}
              sx={{
                overflowX: "auto",
                pb: 0.5,
                "&::-webkit-scrollbar": { display: "none" },
                msOverflowStyle: "none",
                scrollbarWidth: "none",
              }}
            >
              {/* My Status */}
              <Stack
                alignItems="center"
                spacing={0.5}
                sx={{
                  cursor: "pointer",
                  minWidth: 56,
                  maxWidth: 60,
                  flexShrink: 0,
                }}
                onClick={() => navigate("/status")}
              >
                <StatusAvatar
                  src={user?.avatar}
                  name={user?.firstName}
                  size={44}
                  count={myStatuses.length}
                  allViewed={false}
                  isOwn={true}
                  showAddIcon={myStatuses.length === 0}
                />
                <Typography
                  variant="caption"
                  noWrap
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    maxWidth: 58,
                    textAlign: "center",
                  }}
                >
                  My Status
                </Typography>
              </Stack>

              {/* Other users with active status */}
              {otherStatuses.map((group) => {
                const u = group.user;
                const name = u?.firstName || "Contact";
                return (
                  <Stack
                    key={u?._id}
                    alignItems="center"
                    spacing={0.5}
                    sx={{
                      cursor: "pointer",
                      minWidth: 56,
                      maxWidth: 60,
                      flexShrink: 0,
                    }}
                    onClick={() => navigate("/status")}
                  >
                    <StatusAvatar
                      src={u?.avatar}
                      name={name}
                      size={44}
                      count={group.statuses.length}
                      allViewed={group.allViewed}
                    />
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{
                        fontSize: "0.72rem",
                        maxWidth: 58,
                        textAlign: "center",
                      }}
                    >
                      {name}
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          </Box>

          {/* ARCHIVE */}
          <Stack spacing={1}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <ArchiveBox
                  size={24}
                  color={showArchived ? theme.palette.primary.main : undefined}
                />
                <Button
                  onClick={() => setShowArchived((prev) => !prev)}
                  color={showArchived ? "primary" : "inherit"}
                >
                  {showArchived ? "Back to All Chats" : "Archived"}
                </Button>
              </Stack>
              {archivedIds.length > 0 && (
                <Typography
                  variant="caption"
                  sx={{ color: "primary.main", fontWeight: 600, pr: 1 }}
                >
                  {archivedIds.length}
                </Typography>
              )}
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
                  {showArchived ? "Archived Chats" : "All Chats"}
                </Typography>

                {conversations
                  .filter((el) => {
                    const isArch = archivedIds.includes(String(el.id));
                    return showArchived ? isArch : !isArch;
                  })
                  .filter((el) => {
                    if (!searchTerm.trim()) return true;
                    const q = searchTerm.trim().toLowerCase();
                    const nick = getFriendNickname(el.id)?.toLowerCase() || "";
                    return (
                      el?.name?.toLowerCase().includes(q) || nick.includes(q)
                    );
                  })
                  .slice()
                  .sort((a, b) => {
                    const pinA = isFriendPinned(a.id) ? 1 : 0;
                    const pinB = isFriendPinned(b.id) ? 1 : 0;
                    return pinB - pinA;
                  })
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