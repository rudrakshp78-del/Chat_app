import React, { useEffect, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Divider,
  Button,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Camera,
  CircleDashed,
  PencilSimple,
  Plus,
} from "phosphor-react";
import { useDispatch, useSelector } from "react-redux";
import useResponsive from "../../hooks/useResponsive";
import { SimpleBarStyle } from "../../components/Scrollbar";
import StatusAvatar from "../../components/Status/StatusAvatar";
import CreateStatusDialog from "../../sections/dashboard/status/CreateStatusDialog";
import StatusPlayer from "../../sections/dashboard/status/StatusPlayer";
import { FetchAllStatuses } from "../../redux/slices/status";
import { fToNow } from "../../utils/formatTime";

const Status = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const isDesktop = useResponsive("up", "md");

  const { user } = useSelector((state) => state.app);
  const { myStatuses, otherStatuses, isLoading } = useSelector(
    (state) => state.status
  );

  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [createDialogTab, setCreateDialogTab] = useState(0); // 0: text, 1: photo

  // Currently viewing status group: null | { isOwn: boolean, user: object, statuses: array }
  const [activeStory, setActiveStory] = useState(null);

  // Fetch statuses on mount
  useEffect(() => {
    dispatch(FetchAllStatuses());
  }, [dispatch]);

  const handleOpenCreateText = () => {
    setCreateDialogTab(0);
    setOpenCreateDialog(true);
  };

  const handleOpenCreatePhoto = () => {
    setCreateDialogTab(1);
    setOpenCreateDialog(true);
  };

  // Open player for current user
  const handleOpenMyStatus = () => {
    if (myStatuses.length > 0) {
      setActiveStory({
        isOwn: true,
        user: user || { firstName: "Me", lastName: "" },
        statuses: myStatuses,
      });
    } else {
      handleOpenCreateText();
    }
  };

  // Open player for another user
  const handleOpenOtherStatus = (group) => {
    setActiveStory({
      isOwn: false,
      user: group.user,
      statuses: group.statuses,
    });
  };

  // Switch to next user's status when current user finishes
  const handleNextUser = () => {
    if (!activeStory) return;

    if (activeStory.isOwn) {
      // If was viewing own, go to first contact's status
      if (otherStatuses.length > 0) {
        handleOpenOtherStatus(otherStatuses[0]);
      } else {
        setActiveStory(null);
      }
    } else {
      const currentIndex = otherStatuses.findIndex(
        (g) => g.user?._id?.toString() === activeStory.user?._id?.toString()
      );
      if (currentIndex >= 0 && currentIndex < otherStatuses.length - 1) {
        handleOpenOtherStatus(otherStatuses[currentIndex + 1]);
      } else {
        setActiveStory(null);
      }
    }
  };

  // Switch to previous user's status
  const handlePrevUser = () => {
    if (!activeStory) return;

    if (!activeStory.isOwn) {
      const currentIndex = otherStatuses.findIndex(
        (g) => g.user?._id?.toString() === activeStory.user?._id?.toString()
      );
      if (currentIndex > 0) {
        handleOpenOtherStatus(otherStatuses[currentIndex - 1]);
      } else if (myStatuses.length > 0) {
        handleOpenMyStatus();
      }
    }
  };

  const recentUpdates = otherStatuses.filter((s) => !s.allViewed);
  const viewedUpdates = otherStatuses.filter((s) => s.allViewed);

  // LEFT SIDEBAR: Status list (WhatsApp Web style)
  const renderSidebar = (
    <Box
      sx={{
        width: isDesktop ? 340 : "100%",
        minWidth: isDesktop ? 340 : "100%",
        height: "100%",
        minHeight: 0,
        backgroundColor:
          theme.palette.mode === "light"
            ? "#F8FAFF"
            : theme.palette.background.paper,
        boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Stack p={{ xs: 2, sm: 2.5 }} spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        {/* HEADER */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="h5" fontWeight="bold">
            Status
          </Typography>

          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Tooltip title="Type a Status">
              <IconButton onClick={handleOpenCreateText} size="small">
                <PencilSimple size={20} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Photo Status">
              <IconButton onClick={handleOpenCreatePhoto} size="small">
                <Camera size={20} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Divider />

        {/* STATUS LIST SCROLLER */}
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <SimpleBarStyle timeout={500} clickOnTrack={false}>
            <Stack spacing={2} pb={2}>
              {/* =========================================================
                  MY STATUS ROW
                  ========================================================= */}
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1.5,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "background-color 0.15s",
                  "&:hover": {
                    bgcolor: (theme) =>
                      theme.palette.mode === "light" ? "#f0f4f8" : "#2a3442",
                  },
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1.75}
                  sx={{ flex: 1, minWidth: 0 }}
                  onClick={handleOpenMyStatus}
                >
                  <StatusAvatar
                    src={user?.avatar}
                    name={user?.firstName}
                    size={48}
                    count={myStatuses.length}
                    allViewed={false}
                    isOwn={true}
                    showAddIcon={myStatuses.length === 0}
                  />

                  <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight="bold"
                      noWrap
                    >
                      My Status
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {myStatuses.length > 0
                        ? `${myStatuses.length} status update${
                            myStatuses.length > 1 ? "s" : ""
                          } • ${fToNow(
                            myStatuses[myStatuses.length - 1].createdAt
                          )}`
                        : "Tap to add status update"}
                    </Typography>
                  </Stack>
                </Stack>

                <Tooltip title="Add Status Update">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCreateText();
                    }}
                    sx={{
                      bgcolor: "#25D366",
                      color: "#fff",
                      "&:hover": { bgcolor: "#1ebd58" },
                    }}
                  >
                    <Plus size={16} weight="bold" />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* LOADING STATE */}
              {isLoading && otherStatuses.length === 0 && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              )}

              {/* =========================================================
                  RECENT UPDATES (Unviewed)
                  ========================================================= */}
              {recentUpdates.length > 0 && (
                <Stack spacing={1}>
                  <Typography
                    variant="caption"
                    fontWeight="bold"
                    sx={{ color: "#25D366", letterSpacing: 0.5, px: 1, pt: 1 }}
                  >
                    RECENT UPDATES
                  </Typography>

                  {recentUpdates.map((group) => {
                    const u = group.user;
                    const name =
                      `${u?.firstName || ""} ${u?.lastName || ""}`.trim() ||
                      "Contact";
                    const isSelected =
                      activeStory &&
                      !activeStory.isOwn &&
                      activeStory.user?._id?.toString() === u?._id?.toString();

                    return (
                      <Box
                        key={u?._id}
                        onClick={() => handleOpenOtherStatus(group)}
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          bgcolor: isSelected
                            ? (theme) =>
                                theme.palette.mode === "light"
                                  ? "#e6f4ea"
                                  : "#1b3323"
                            : "transparent",
                          transition: "background-color 0.15s",
                          "&:hover": {
                            bgcolor: (theme) =>
                              theme.palette.mode === "light"
                                ? "#f0f4f8"
                                : "#2a3442",
                          },
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.75} sx={{ minWidth: 0, flex: 1 }}>
                          <StatusAvatar
                            src={u?.avatar}
                            name={name}
                            size={48}
                            count={group.statuses.length}
                            allViewed={false}
                          />

                          <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                              variant="subtitle2"
                              fontWeight="bold"
                              noWrap
                            >
                              {name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              noWrap
                            >
                              {fToNow(group.latestStatusAt)}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              )}

              {/* =========================================================
                  VIEWED UPDATES
                  ========================================================= */}
              {viewedUpdates.length > 0 && (
                <Stack spacing={1}>
                  <Typography
                    variant="caption"
                    fontWeight="bold"
                    sx={{
                      color: "text.secondary",
                      letterSpacing: 0.5,
                      px: 1,
                      pt: 1,
                    }}
                  >
                    VIEWED UPDATES
                  </Typography>

                  {viewedUpdates.map((group) => {
                    const u = group.user;
                    const name =
                      `${u?.firstName || ""} ${u?.lastName || ""}`.trim() ||
                      "Contact";
                    const isSelected =
                      activeStory &&
                      !activeStory.isOwn &&
                      activeStory.user?._id?.toString() === u?._id?.toString();

                    return (
                      <Box
                        key={u?._id}
                        onClick={() => handleOpenOtherStatus(group)}
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          bgcolor: isSelected
                            ? (theme) =>
                                theme.palette.mode === "light"
                                  ? "#e6f4ea"
                                  : "#1b3323"
                            : "transparent",
                          transition: "background-color 0.15s",
                          "&:hover": {
                            bgcolor: (theme) =>
                              theme.palette.mode === "light"
                                ? "#f0f4f8"
                                : "#2a3442",
                          },
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.75} sx={{ minWidth: 0, flex: 1 }}>
                          <StatusAvatar
                            src={u?.avatar}
                            name={name}
                            size={48}
                            count={group.statuses.length}
                            allViewed={true}
                          />

                          <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                              variant="subtitle2"
                              fontWeight="bold"
                              noWrap
                            >
                              {name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              noWrap
                            >
                              {fToNow(group.latestStatusAt)}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              )}

              {/* EMPTY STATE */}
              {!isLoading && otherStatuses.length === 0 && (
                <Box
                  sx={{
                    textAlign: "center",
                    py: 5,
                    px: 2,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <CircleDashed
                    size={48}
                    color={theme.palette.primary.main}
                    style={{ opacity: 0.6 }}
                  />
                  <Typography
                    variant="subtitle2"
                    fontWeight="bold"
                    sx={{ mt: 1.5 }}
                  >
                    No contact status updates yet
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 0.5, maxWidth: 220 }}
                  >
                    Post a status so everyone can see what you are up to!
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<PencilSimple />}
                    onClick={handleOpenCreateText}
                    sx={{ mt: 2 }}
                  >
                    Post Status
                  </Button>
                </Box>
              )}
            </Stack>
          </SimpleBarStyle>
        </Box>
      </Stack>
    </Box>
  );

  // RIGHT PANEL (Desktop): Story Player or WhatsApp Status Welcome Graphic
  const renderRightPanel = (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        height: "100%",
        minHeight: 0,
        bgcolor: "#0b141a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {activeStory ? (
        <StatusPlayer
          key={
            activeStory.isOwn
              ? "own"
              : activeStory.user?._id || "player"
          }
          user={activeStory.user}
          statuses={activeStory.statuses}
          isOwn={activeStory.isOwn}
          onClose={() => setActiveStory(null)}
          onNextUser={handleNextUser}
          onPrevUser={handlePrevUser}
        />
      ) : (
        /* WhatsApp Status Placeholder */
        <Stack
          spacing={2}
          alignItems="center"
          sx={{
            textAlign: "center",
            maxWidth: 360,
            p: 3,
            color: "#ffffff",
          }}
        >
          <Box
            sx={{
              width: 90,
              height: 90,
              borderRadius: "50%",
              bgcolor: "rgba(37, 211, 102, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#25D366",
            }}
          >
            <CircleDashed size={52} />
          </Box>

          <Typography variant="h5" fontWeight="bold">
            Status Updates
          </Typography>

          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
            Click on a contact to view their status updates, or share a new
            status with everyone!
          </Typography>

          <Typography
            variant="caption"
            sx={{ color: "rgba(255,255,255,0.45)" }}
          >
            Status updates automatically disappear after 24 hours.
          </Typography>

          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={handleOpenCreateText}
            sx={{
              bgcolor: "#25D366",
              "&:hover": { bgcolor: "#1ebd58" },
              color: "#ffffff",
              fontWeight: "bold",
              mt: 1,
            }}
          >
            Create Status
          </Button>
        </Stack>
      )}
    </Box>
  );

  return (
    <>
      <Stack direction="row" sx={{ width: "100%", height: "100%", overflow: "hidden" }}>
        {/* On mobile: if active story is open, show story player full screen */}
        {!isDesktop && activeStory ? (
          <Box sx={{ width: "100%", height: "100%" }}>
            <StatusPlayer
              user={activeStory.user}
              statuses={activeStory.statuses}
              isOwn={activeStory.isOwn}
              onClose={() => setActiveStory(null)}
              onNextUser={handleNextUser}
              onPrevUser={handlePrevUser}
            />
          </Box>
        ) : (
          renderSidebar
        )}

        {/* On desktop: show both sidebar and right pane player/welcome */}
        {isDesktop && renderRightPanel}
      </Stack>

      {/* CREATE STATUS DIALOG */}
      {openCreateDialog && (
        <CreateStatusDialog
          open={openCreateDialog}
          handleClose={() => setOpenCreateDialog(false)}
          initialTab={createDialogTab}
        />
      )}
    </>
  );
};

export default Status;
