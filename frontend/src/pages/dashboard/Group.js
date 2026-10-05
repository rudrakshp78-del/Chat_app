import {
  Box,
  Stack,
  Typography,
  Link,
  IconButton,
  Divider,
} from "@mui/material";
import React, { useState } from "react";
import {
  Search,
  SearchIconWrapper,
  StyledInputBase,
} from "../../components/Search";
import { SimpleBarStyle } from "../../components/Scrollbar";
import { MagnifyingGlass, Plus } from "phosphor-react";
import { useTheme } from "@mui/material/styles";
import { ChatList } from "../../data";
import ChatElement from "../../components/ChatElement";
import CreateGroup from "../../sections/dashboard/CreateGroup";

const Group = () => {
  const theme = useTheme();
  const [openDialog, setOpenDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customGroups, setCustomGroups] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("trackon_custom_groups") || "[]");
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    const syncGroups = () => {
      try {
        setCustomGroups(
          JSON.parse(localStorage.getItem("trackon_custom_groups") || "[]")
        );
      } catch {
        setCustomGroups([]);
      }
    };
    window.addEventListener("groups_updated", syncGroups);
    return () => window.removeEventListener("groups_updated", syncGroups);
  }, []);

  const handleCloseDailog = () => {
    setOpenDialog(false);
  };

  const allGroups = React.useMemo(() => {
    const combined = [...customGroups, ...ChatList];
    if (!searchQuery.trim()) return combined;
    const q = searchQuery.trim().toLowerCase();
    return combined.filter((el) => el?.name?.toLowerCase().includes(q));
  }, [customGroups, searchQuery]);

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
                <Stack spacing={2}>
                  <Typography variant="subtitle2" sx={{ color: "#676667" }}>
                    Pinned
                  </Typography>
                  {allGroups
                    .filter((el) => el.pinned)
                    .map((el) => (
                      <ChatElement key={el.id} {...el} />
                    ))}

                  <Typography variant="subtitle2" sx={{ color: "#676667", pt: 1 }}>
                    All Groups
                  </Typography>
                  {allGroups
                    .filter((el) => !el.pinned)
                    .map((el) => (
                      <ChatElement key={el.id} {...el} />
                    ))}
                </Stack>
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
