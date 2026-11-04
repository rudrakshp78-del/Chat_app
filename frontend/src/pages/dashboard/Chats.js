import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Divider,
  Button,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import {
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
import ProfileMenu from "../../layouts/dashboard/ProfileMenu";

import { socket } from "../../socket";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FetchDirectConversations,
  FetchDirectConversationsFromServer,
} from "../../redux/slices/Conversation";
import { FetchAllStatuses } from "../../redux/slices/status";
import {
  isFriendPinned,
  getFriendNickname,
} from "../../utils/chatSettingsHelpers";

const Chats = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const dispatch = useDispatch();

  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [, setFriendshipTick] = useState(0);

  const { user } = useSelector((state) => state.app);
  const { conversations } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { myStatuses, otherStatuses } = useSelector((state) => state.status);

  const [archivedIds, setArchivedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("trackon_archived_chats") || "[]");
    } catch {
      return [];
    }
  });

  const totalUnreadCount = React.useMemo(() => {
    return (conversations || []).reduce(
      (acc, el) => acc + (Number(el.unread) || 0),
      0
    );
  }, [conversations]);

  const pinnedCount = React.useMemo(() => {
    return (conversations || []).filter((el) => isFriendPinned(el.id)).length;
  }, [conversations]);

  const filteredConversations = React.useMemo(() => {
    return (conversations || [])
      .filter((el) => {
        const isArch = archivedIds.includes(String(el.id));
        if (activeFilter === "archived") return isArch;
        if (isArch) return false;
        if (activeFilter === "unread") return Number(el.unread) > 0;
        if (activeFilter === "pinned") return isFriendPinned(el.id);
        return true;
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
      });
  }, [conversations, activeFilter, archivedIds, searchTerm]);

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
    const handleAppRefresh = () => {
      dispatch(FetchDirectConversationsFromServer());
      dispatch(FetchAllStatuses());
    };
    window.addEventListener("app_refresh", handleAppRefresh);
    return () => {
      window.removeEventListener("app_refresh", handleAppRefresh);
    };
  }, [dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(FetchAllStatuses());
    }, 400);
    return () => clearTimeout(timer);
  }, [dispatch]);

  const authUserId = useSelector((state) => state.auth.user_id);

  useEffect(() => {
    const user_id = authUserId || window.localStorage.getItem("user_id");

    if (!user_id) {
      return;
    }

    let received = false;

    const handleConversationsData = (data) => {
      if (!Array.isArray(data)) return;
      received = true;
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

    // Fetch immediately via HTTP REST API so we don't wait for Socket.IO handshake
    dispatch(FetchDirectConversationsFromServer());

    // Set user_id for Socket.IO connection
    socket.io.opts.query = {
      user_id,
    };

    socket.on("connect", requestConversations);
    socket.on("direct_conversations", handleConversationsData);

    if (!socket.connected) {
      socket.connect();
    } else if (!received) {
      requestConversations();
    }

    return () => {
      socket.off("connect", requestConversations);
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
          pt={{ xs: 0.75, sm: 1.5 }}
          px={{ xs: 1.75, sm: 2.5 }}
          pb={0}
          spacing={{ xs: 1.25, sm: 2 }}
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
            <Stack direction="row" alignItems="center" spacing={1.2}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                  background: (theme) =>
                    theme.palette.mode === "light"
                      ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #00A884 60%, #1CCAFF 100%)`
                      : `linear-gradient(135deg, #60A5FA 0%, #34D399 60%, #38BDF8 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  display: "inline-block",
                }}
              >
                Track-Chat
              </Typography>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: "#00A884",
                  boxShadow: "0 0 0 2px rgba(0, 168, 132, 0.35)",
                  animation: "pulse 2s infinite ease-in-out",
                  "@keyframes pulse": {
                    "0%": { transform: "scale(0.95)", opacity: 0.8 },
                    "50%": { transform: "scale(1.2)", opacity: 1 },
                    "100%": { transform: "scale(0.95)", opacity: 0.8 },
                  },
                }}
              />
            </Stack>

            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton
                onClick={handleOpenDialog}
                title="Explore & Friends"
                sx={{
                  p: 1.1,
                  borderRadius: 2,
                  bgcolor: (theme) =>
                    theme.palette.mode === "light"
                      ? alpha(theme.palette.primary.main, 0.08)
                      : alpha(theme.palette.primary.main, 0.2),
                  color: "primary.main",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                    transform: "scale(1.08)",
                  },
                }}
              >
                <Users size={20} weight="duotone" />
              </IconButton>
              <ProfileMenu />
            </Stack>
          </Stack>

          {/* DESKTOP NOTIFICATION PROMPT */}
          <NotificationBanner />

          {/* SEARCH */}
          <Stack sx={{ width: "100%" }}>
            <Search
              sx={{
                borderRadius: 2.5,
                border: (theme) =>
                  `1px solid ${
                    theme.palette.mode === "light"
                      ? "rgba(1, 98, 196, 0.14)"
                      : "rgba(255, 255, 255, 0.1)"
                  }`,
                bgcolor: (theme) =>
                  theme.palette.mode === "light"
                    ? "#ffffff"
                    : alpha(theme.palette.background.paper, 0.8),
                boxShadow: (theme) =>
                  theme.palette.mode === "light"
                    ? "0 2px 8px rgba(0, 0, 0, 0.04)"
                    : "0 2px 8px rgba(0, 0, 0, 0.2)",
                transition: "all 0.2s ease-in-out",
                "&:focus-within": {
                  borderColor: "primary.main",
                  boxShadow: (theme) =>
                    `0 0 0 3px ${alpha(theme.palette.primary.main, 0.18)}`,
                },
              }}
            >
              <SearchIconWrapper>
                <MagnifyingGlass
                  size={18}
                  weight="bold"
                  color={theme.palette.primary.main}
                />
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

          {/* TRENDING CHAT FILTERS */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              overflowX: "auto",
              py: 0.5,
              "&::-webkit-scrollbar": { display: "none" },
              msOverflowStyle: "none",
              scrollbarWidth: "none",
            }}
          >
            {[
              {
                id: "all",
                label: "All",
                count: (conversations || []).filter(
                  (c) => !archivedIds.includes(String(c.id))
                ).length,
              },
              { id: "unread", label: "Unread", count: totalUnreadCount },
              { id: "pinned", label: "Pinned", count: pinnedCount },
              { id: "archived", label: "Archived", count: archivedIds.length },
            ].map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <Box
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  sx={{
                    px: 1.6,
                    py: 0.55,
                    borderRadius: 2,
                    fontSize: "0.785rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    transition: "all 0.2s ease-in-out",
                    ...(isActive
                      ? {
                          bgcolor: "primary.main",
                          color: "#ffffff",
                          boxShadow: (theme) =>
                            `0 3px 10px ${alpha(theme.palette.primary.main, 0.35)}`,
                        }
                      : {
                          bgcolor: (theme) =>
                            theme.palette.mode === "light"
                              ? alpha(theme.palette.primary.main, 0.06)
                              : alpha(theme.palette.primary.main, 0.15),
                          color: "text.secondary",
                          "&:hover": {
                            bgcolor: (theme) =>
                              alpha(theme.palette.primary.main, 0.12),
                            color: "text.primary",
                          },
                        }),
                  }}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <Box
                      component="span"
                      sx={{
                        px: 0.65,
                        py: 0.1,
                        borderRadius: 1,
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        bgcolor: isActive
                          ? "rgba(255, 255, 255, 0.25)"
                          : (theme) => alpha(theme.palette.primary.main, 0.15),
                        color: isActive ? "#ffffff" : "primary.main",
                      }}
                    >
                      {tab.count}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Stack>

          {/* STATUS TRAY */}
          <Box sx={{ width: "100%", pt: 0.2, pb: 0.2 }}>
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

          <Divider sx={{ my: 0.5 }} />

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
              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mt: 0.5, mb: 0.5, px: 0.5 }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 1.1,
                      fontSize: "0.72rem",
                    }}
                  >
                    {activeFilter === "archived"
                      ? "Archived Chats"
                      : activeFilter === "unread"
                      ? "Unread Messages"
                      : activeFilter === "pinned"
                      ? "Pinned Best Friends"
                      : "Recent Chats"}
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{
                      color: "primary.main",
                      fontWeight: 700,
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                      px: 0.9,
                      py: 0.25,
                      borderRadius: 1,
                      fontSize: "0.7rem",
                    }}
                  >
                    {filteredConversations.length}
                  </Typography>
                </Stack>

                {filteredConversations.length === 0 ? (
                  <Box
                    sx={{
                      py: 6,
                      textAlign: "center",
                      color: "text.secondary",
                    }}
                  >
                    <Typography variant="body2" fontWeight={500}>
                      {activeFilter === "unread"
                        ? "No unread messages"
                        : activeFilter === "pinned"
                        ? "No pinned best friends yet"
                        : activeFilter === "archived"
                        ? "No archived conversations"
                        : searchTerm
                        ? "No chats found matching search"
                        : "No conversations yet"}
                    </Typography>
                    {activeFilter === "all" && !searchTerm && (
                      <Button
                        size="small"
                        onClick={handleOpenDialog}
                        variant="outlined"
                        sx={{ mt: 2, borderRadius: 2, textTransform: "none" }}
                      >
                        Find People to Chat
                      </Button>
                    )}
                  </Box>
                ) : (
                  filteredConversations.map((el) => (
                    <ChatElement key={el.id} {...el} />
                  ))
                )}
              </Stack>
            </SimpleBarStyle>
          </Box>
        </Stack>
      </Box>

      {openDialog && (
        <Friends open={openDialog} handleClose={handleCloseDialog} />
      )}
    </>
  );
};

export default Chats;