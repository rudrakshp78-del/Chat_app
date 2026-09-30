import { useTheme } from "@mui/material/styles";
import {
  Stack,
  Box,
  IconButton,
  Typography,
  Avatar,
  Divider,
  Button,
  Paper,
  Chip,
  Grid,
} from "@mui/material";
import React, { useState } from "react";
import {
  Bell,
  CaretLeft,
  CaretRight,
  Image,
  Info,
  Key,
  Keyboard,
  Lock,
  Note,
  ShieldCheck,
  Palette,
  CheckCircle,
  PencilSimple,
} from "phosphor-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Shortcuts from "../../sections/dashboard/settings/Shortcuts";
import NotificationDialog from "../../sections/dashboard/settings/NotificationDialog";
import PrivacyDialog from "../../sections/dashboard/settings/PrivacyDialog";
import SecurityDialog from "../../sections/dashboard/settings/SecurityDialog";
import ThemeDialog from "../../sections/dashboard/settings/ThemeDialog";
import WallpaperDialog from "../../sections/dashboard/settings/WallpaperDialog";
import RequestAccountDialog from "../../sections/dashboard/settings/RequestAccountDialog";
import HelpDialog from "../../sections/dashboard/settings/HelpDialog";
import getAvatarUrl from "../../utils/getAvatarUrl";
import useSettings from "../../hooks/useSettings";

const Settings = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { themeMode, themeColorPresets } = useSettings();
  const { user } = useSelector((state) => state.app);

  const fullName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : "User";

  const [openShortcuts, setOpenShortcuts] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [openPrivacy, setOpenPrivacy] = useState(false);
  const [openSecurity, setOpenSecurity] = useState(false);
  const [openTheme, setOpenTheme] = useState(false);
  const [openWallpaper, setOpenWallpaper] = useState(false);
  const [openRequestAccount, setOpenRequestAccount] = useState(false);
  const [openHelp, setOpenHelp] = useState(false);

  const handleOpenShortcuts = () => setOpenShortcuts(true);
  const handleCloseShortcuts = () => setOpenShortcuts(false);

  const list = [
    {
      Key: 0,
      icon: <Bell size={22} color="#00A884" weight="duotone" />,
      title: "Notifications",
      subtitle: "Messages, groups & call alerts",
      onclick: () => setOpenNotifications(true),
    },
    {
      Key: 1,
      icon: <Lock size={22} color="#00A884" weight="duotone" />,
      title: "Privacy",
      subtitle: "Block contacts, disappearing messages",
      onclick: () => setOpenPrivacy(true),
    },
    {
      Key: 2,
      icon: <Key size={22} color="#00A884" weight="duotone" />,
      title: "Security",
      subtitle: "End-to-end encryption, 2-step PIN",
      onclick: () => setOpenSecurity(true),
    },
    {
      Key: 3,
      icon: <Palette size={22} color="#00A884" weight="duotone" />,
      title: "Theme",
      subtitle: "Light, Dark mode & Accent colors",
      onclick: () => setOpenTheme(true),
    },
    {
      Key: 4,
      icon: <Image size={22} color="#00A884" weight="duotone" />,
      title: "Chat Wallpaper",
      subtitle: "Doodles, solid colors & gallery photos",
      onclick: () => setOpenWallpaper(true),
    },
    {
      Key: 5,
      icon: <Note size={22} color="#00A884" weight="duotone" />,
      title: "Request Account Info",
      subtitle: "Download account details report",
      onclick: () => setOpenRequestAccount(true),
    },
    {
      Key: 6,
      icon: <Keyboard size={22} color="#00A884" weight="duotone" />,
      title: "Keyboard Shortcuts",
      subtitle: "Quick navigation hotkeys",
      onclick: handleOpenShortcuts,
    },
    {
      Key: 7,
      icon: <Info size={22} color="#00A884" weight="duotone" />,
      title: "Help",
      subtitle: "Help center, contact us, app info",
      onclick: () => setOpenHelp(true),
    },
  ];

  return (
    <>
      <Stack direction={"row"} sx={{ width: "100%", height: "100%" }}>
        {/* ================= LEFT PANEL ================= */}
        <Box
          sx={{
            overflowY: "auto",
            height: "100%",
            width: { xs: "100%", md: 380 },
            flexShrink: 0,
            backgroundColor:
              theme.palette.mode === "light"
                ? "#F8FAFF"
                : theme.palette.background.paper,
            boxShadow: { xs: "none", md: "0px 0px 2px rgba(0, 0, 0, 0.25)" },
          }}
        >
          <Stack p={{ xs: 2.5, sm: 3.5 }} spacing={3}>
            {/* Header */}
            <Stack direction={"row"} alignItems="center" spacing={2}>
              <IconButton onClick={() => navigate("/app")}>
                <CaretLeft size={24} color={"#4B4B4B"} />
              </IconButton>
              <Typography variant="h5" fontWeight={700}>
                Settings
              </Typography>
            </Stack>

            {/* Profile Glance Card (Clickable to Edit Profile) */}
            <Paper
              variant="outlined"
              onClick={() => navigate("/profile")}
              sx={{
                p: 2,
                borderRadius: 2.5,
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
                bgcolor:
                  theme.palette.mode === "light"
                    ? "#FFFFFF"
                    : "rgba(255, 255, 255, 0.04)",
                "&:hover": {
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  borderColor: theme.palette.primary.main,
                },
              }}
            >
              <Stack direction={"row"} spacing={2} alignItems="center">
                <Avatar
                  sx={{ width: 60, height: 60, border: "2px solid #00A884" }}
                  src={getAvatarUrl(user?.avatar, fullName)}
                  alt={fullName}
                >
                  {(fullName || "U")[0]}
                </Avatar>
                <Stack spacing={0.25} sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                    {fullName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {user?.about || "Hey there! I am using Tawk."}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="primary.main"
                    fontWeight={600}
                    sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}
                  >
                    <PencilSimple size={14} /> Edit Profile & DP
                  </Typography>
                </Stack>
                <CaretRight size={18} color="#94a3b8" />
              </Stack>
            </Paper>

            <Divider />

            {/* List of Options */}
            <Stack spacing={1}>
              {list.map(({ Key, icon, title, subtitle, onclick }) => (
                <Stack
                  key={Key}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  onClick={onclick}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      bgcolor:
                        theme.palette.mode === "light"
                          ? "#EEF2F6"
                          : "rgba(255, 255, 255, 0.06)",
                    },
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 1.5,
                        bgcolor:
                          theme.palette.mode === "light"
                            ? "rgba(0, 168, 132, 0.08)"
                            : "rgba(0, 168, 132, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {icon}
                    </Box>
                    <Stack spacing={0.25}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {subtitle}
                      </Typography>
                    </Stack>
                  </Stack>
                  <CaretRight size={16} color="#94a3b8" />
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Box>

        {/* ================= RIGHT PANEL (DESKTOP HERO) ================= */}
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            flexGrow: 1,
            height: "100%",
            bgcolor:
              theme.palette.mode === "light"
                ? "#F0F2F5"
                : theme.palette.background.default,
            alignItems: "center",
            justifyContent: "center",
            p: 4,
            overflowY: "auto",
          }}
        >
          <Paper
            elevation={0}
            variant="outlined"
            sx={{
              maxWidth: 580,
              width: "100%",
              p: 4,
              borderRadius: 3.5,
              textAlign: "center",
              bgcolor:
                theme.palette.mode === "light"
                  ? "#FFFFFF"
                  : theme.palette.background.paper,
            }}
          >
            {/* Header Icon */}
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                bgcolor: "rgba(0, 168, 132, 0.12)",
                color: "#00A884",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
              }}
            >
              <ShieldCheck size={40} weight="duotone" />
            </Box>

            <Typography variant="h5" fontWeight={700} gutterBottom>
              Tawk Settings Hub
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Manage your notifications, security, themes, chat wallpapers, and
              account privacy in one unified place.
            </Typography>

            {/* Quick Status Badges */}
            <Stack
              direction="row"
              spacing={1}
              justifyContent="center"
              flexWrap="wrap"
              sx={{ mb: 3.5 }}
            >
              <Chip
                icon={<CheckCircle size={16} />}
                label="End-to-End Encrypted"
                color="success"
                size="small"
                variant="outlined"
              />
              <Chip
                label={`Theme: ${themeMode === "light" ? "Light" : "Dark"}`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`Accent: ${themeColorPresets}`}
                size="small"
                variant="outlined"
              />
            </Stack>

            <Divider sx={{ mb: 3 }} />

            {/* Quick Actions Grid */}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Image size={18} color="#00A884" />}
                  onClick={() => setOpenWallpaper(true)}
                  sx={{ py: 1.25, borderRadius: 2, textTransform: "none" }}
                >
                  Chat Wallpaper
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Lock size={18} color="#00A884" />}
                  onClick={() => setOpenPrivacy(true)}
                  sx={{ py: 1.25, borderRadius: 2, textTransform: "none" }}
                >
                  Privacy Checkup
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Key size={18} color="#00A884" />}
                  onClick={() => setOpenSecurity(true)}
                  sx={{ py: 1.25, borderRadius: 2, textTransform: "none" }}
                >
                  Security & PIN
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Bell size={18} color="#00A884" />}
                  onClick={() => setOpenNotifications(true)}
                  sx={{ py: 1.25, borderRadius: 2, textTransform: "none" }}
                >
                  Notifications
                </Button>
              </Grid>
            </Grid>

            {/* Footer encryption message */}
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="center"
              sx={{ mt: 3.5, color: "text.secondary" }}
            >
              <Lock size={14} />
              <Typography variant="caption">
                Your personal messages are end-to-end encrypted
              </Typography>
            </Stack>
          </Paper>
        </Box>
      </Stack>

      {/* ================= DIALOGS ================= */}
      {openShortcuts && (
        <Shortcuts open={openShortcuts} handleClose={handleCloseShortcuts} />
      )}
      {openNotifications && (
        <NotificationDialog
          open={openNotifications}
          handleClose={() => setOpenNotifications(false)}
        />
      )}
      {openPrivacy && (
        <PrivacyDialog
          open={openPrivacy}
          handleClose={() => setOpenPrivacy(false)}
        />
      )}
      {openSecurity && (
        <SecurityDialog
          open={openSecurity}
          handleClose={() => setOpenSecurity(false)}
        />
      )}
      {openTheme && (
        <ThemeDialog
          open={openTheme}
          handleClose={() => setOpenTheme(false)}
        />
      )}
      {openWallpaper && (
        <WallpaperDialog
          open={openWallpaper}
          handleClose={() => setOpenWallpaper(false)}
        />
      )}
      {openRequestAccount && (
        <RequestAccountDialog
          open={openRequestAccount}
          handleClose={() => setOpenRequestAccount(false)}
        />
      )}
      {openHelp && (
        <HelpDialog
          open={openHelp}
          handleClose={() => setOpenHelp(false)}
        />
      )}
    </>
  );
};

export default Settings;
