import {
  Box,
  Divider,
  IconButton,
  Stack,
  Typography,
  Link,
} from "@mui/material";
import React, { useEffect, useState, useMemo } from "react";
import {
  Search,
  SearchIconWrapper,
  StyledInputBase,
} from "../../components/Search";
import { MagnifyingGlass, Plus } from "phosphor-react";
import { useTheme } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import { SimpleBarStyle } from "../../components/Scrollbar";
import { CallLogElement } from "../../components/CallElement";
import { CallLogs } from "../../data";
import StartCall from "../../sections/dashboard/StartCall";
import { FetchCallLogs } from "../../redux/slices/app";

const Call = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [openDialog, setOpenDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { call_logs = [], user } = useSelector((state) => state.app);
  const { user_id } = useSelector((state) => state.auth);
  const myUserId = (
    user_id ||
    user?._id ||
    (typeof window !== "undefined" ? window.localStorage.getItem("user_id") : "") ||
    ""
  ).toString();

  useEffect(() => {
    dispatch(FetchCallLogs());
  }, [dispatch]);

  const handleCloseDailog = () => {
    setOpenDialog(false);
  };

  const formattedRealLogs = useMemo(() => {
    if (!Array.isArray(call_logs) || call_logs.length === 0) return [];
    return call_logs.map((log, idx) => {
      const fromId = (log?.from?._id || log?.from || "").toString();
      const incoming = fromId && fromId !== myUserId;
      const otherPerson = incoming ? log?.from : log?.to;
      const otherId = (otherPerson?._id || otherPerson || "").toString();
      const name = otherPerson
        ? `${otherPerson.firstName || ""} ${otherPerson.lastName || ""}`.trim() ||
          "User"
        : "User";
      const dateStr = log?.startedAt
        ? new Date(log.startedAt).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Recently";

      return {
        key: log?._id || idx,
        id: otherId,
        name,
        img: otherPerson?.avatar,
        incoming,
        missed: log?.verdict !== "Accepted",
        online: otherPerson?.status === "Online",
        timestamp: dateStr,
      };
    });
  }, [call_logs, myUserId]);

  const filteredLogs = formattedRealLogs.filter((el) =>
    !searchQuery.trim()
      ? true
      : el?.name?.toLowerCase().includes(searchQuery.trim().toLowerCase())
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
              <Typography variant="h5">Call Logs</Typography>
            </Stack>
            <Stack sx={{ width: "100%" }}>
              <Search>
                <SearchIconWrapper>
                  <MagnifyingGlass color="#709CE6" />
                </SearchIconWrapper>

                <StyledInputBase
                  placeholder="Search..."
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
                Start Conversation
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
                    All Calls
                  </Typography>
                  {/* Call Logs */}
                  {filteredLogs.map((el, idx) => (
                    <CallLogElement
                      key={el.key || el.id || idx}
                      {...el}
                      onStartNewCall={() => setOpenDialog(true)}
                    />
                  ))}
                </Stack>
              </SimpleBarStyle>
            </Stack>
          </Stack>
        </Box>
      </Stack>

      {openDialog && (
        <StartCall open={openDialog} handleClose={handleCloseDailog} />
      )}
    </>
  );
};

export default Call;
