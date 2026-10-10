import {
  Box,
  Stack,
  Typography,
  Link,
  IconButton,
  Divider,
  Button,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import {
  Search,
  SearchIconWrapper,
  StyledInputBase,
} from "../../components/Search";
import { SimpleBarStyle } from "../../components/Scrollbar";
import { MagnifyingGlass, Plus, Users } from "phosphor-react";
import { useTheme } from "@mui/material/styles";
import { useDispatch } from "react-redux";
import ChatElement from "../../components/ChatElement";
import CreateGroup from "../../sections/dashboard/CreateGroup";
import {
  FetchAllUsers,
  FetchFriends,
  FetchUsers,
} from "../../redux/slices/app";
import { isFriendPinned } from "../../utils/chatSettingsHelpers";

const FAKE_GROUP_NAMES = new Set([
  "alex johnson",
  "sarah connor",
  "michael brown",
  "emma watson",
  "david miller",
  "james wilson",
  "olivia taylor",
  "daniel anderson",
]);

const loadRealGroups = () => {
  try {
    const raw = JSON.parse(
      localStorage.getItem("trackon_custom_groups") || "[]"
    );
    if (!Array.isArray(raw)) return [];
    const filtered = raw.filter(
      (g) => g && g.name && !FAKE_GROUP_NAMES.has(g.name.trim().toLowerCase())
    );
    if (filtered.length !== raw.length) {
      localStorage.setItem("trackon_custom_groups", JSON.stringify(filtered));
    }
    return filtered;
  } catch {
    return [];
  }
};

const Group = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [openDialog, setOpenDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setPinTick] = useState(0);
  const [customGroups, setCustomGroups] = useState(loadRealGroups);

  useEffect(() => {
    // Pre-fetch real users so Create New Group modal has real members immediately
    dispatch(FetchAllUsers());
    dispatch(FetchFriends());
    dispatch(FetchUsers());
  }, [dispatch]);

  useEffect(() => {
    const syncGroups = () => {
      setCustomGroups(loadRealGroups());
    };
    const syncPins = () => {
      setPinTick((t) => t + 1);
    };
    window.addEventListener("groups_updated", syncGroups);
    window.addEventListener("friendship_updated", syncPins);
    return () => {
      window.removeEventListener("groups_updated", syncGroups);
      window.removeEventListener("friendship_updated", syncPins);
    };
  }, []);

  const handleCloseDailog = () => {
    setOpenDialog(false);
  };

  const allGroups = React.useMemo(() => {
    if (!searchQuery.trim()) return customGroups;
    const q = searchQuery.trim().toLowerCase();
    return customGroups.filter((el) => el?.name?.toLowerCase().includes(q));
  }, [customGroups, searchQuery]);

  const pinnedGroups = allGroups.filter(
    (el) => Boolean(el.pinned || isFriendPinned(el.id))
  );
  const unpinnedGroups = allGroups.filter(
    (el) => !el.pinned && !isFriendPinned(el.id)
  );

  return (
    <>
      <Stack direction="row" sx={{ width: "100%", height: "100%" }}>
        {/* left */}
        <Box
          sx={{
            height: "100%",
            backgroundColor: (theme) =>
              theme.palette.mode === "light"
                ? "#F8FAFF"
                : theme.palette.background.paper,
            width: { xs: "100%", md: 320 },
            boxShadow: { xs: "none", md: "0px 0px 2px rgba(0, 0, 0, 0.25)" },
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Stack
            p={{ xs: 2, sm: 3 }}
            spacing={2}
            sx={{ height: "100%", flex: 1, minHeight: 0 }}
          >
            <Stack>
              <Typography variant="h5">Groups</Typography>
            </Stack>
            <Stack sx={{ width: "100%" }}>
              <Search>
                <SearchIconWrapper>
                  <MagnifyingGlass color="#709CE6" />
                </SearchIconWrapper>

                <StyledInputBase
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  inputProps={{
                    "aria-label": "search",
                  }}
                />
              </Search>
            </Stack>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems={"center"}
            >
              <Typography
                variant="subtitle2"
                component={Link}
                onClick={() => setOpenDialog(true)}
                sx={{ cursor: "pointer", textDecoration: "none" }}
              >
                Create New Group
              </Typography>
              <IconButton
                onClick={() => {
                  setOpenDialog(true);
                }}
              >
                <Plus style={{ color: theme.palette.primary.main }} />
              </IconButton>
            </Stack>
            <Divider />
            <Stack
              spacing={3}
              sx={{ flexGrow: 1, overflowY: "auto", height: "100%" }}
            >
              <SimpleBarStyle timeout={500} clickOnTrack={false}>
                {allGroups.length === 0 ? (
                  <Stack
                    spacing={1.5}
                    alignItems="center"
                    justifyContent="center"
                    sx={{ py: 6, px: 2, textAlign: "center" }}
                  >
                    <Users
                      size={44}
                      color={theme.palette.primary.main}
                      style={{ opacity: 0.65 }}
                    />
                    <Typography variant="subtitle2" fontWeight={700}>
                      No groups created yet
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tap "Create New Group" above to start a group with your friends.
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Plus size={16} />}
                      onClick={() => setOpenDialog(true)}
                      sx={{ mt: 1, textTransform: "none", borderRadius: 2 }}
                    >
                      Create New Group
                    </Button>
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    {pinnedGroups.length > 0 && (
                      <>
                        <Typography variant="subtitle2" sx={{ color: "#676667" }}>
                          Pinned
                        </Typography>
                        {pinnedGroups.map((el) => (
                          <ChatElement key={el.id} {...el} />
                        ))}
                      </>
                    )}

                    <Typography
                      variant="subtitle2"
                      sx={{ color: "#676667", pt: pinnedGroups.length > 0 ? 1 : 0 }}
                    >
                      All Groups
                    </Typography>
                    {unpinnedGroups.map((el) => (
                      <ChatElement key={el.id} {...el} />
                    ))}
                  </Stack>
                )}
              </SimpleBarStyle>
            </Stack>
          </Stack>
        </Box>
      </Stack>
      {openDialog && (
        <CreateGroup open={openDialog} handleClose={handleCloseDailog} />
      )}
    </>
  );
};

export default Group;
