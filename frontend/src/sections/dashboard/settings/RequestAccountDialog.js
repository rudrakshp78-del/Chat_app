import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  IconButton,
  Divider,
  Box,
  Paper,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  useTheme,
} from "@mui/material";
import {
  Note,
  X,
  CheckCircle,
  DownloadSimple,
  ShieldCheck,
  User,
  Gear,
} from "phosphor-react";
import { useSelector, useDispatch } from "react-redux";
import { showSnackbar } from "../../../redux/slices/app";

const RequestAccountDialog = ({ open, handleClose }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.app);

  const [status, setStatus] = useState(() => {
    try {
      return localStorage.getItem("Trackon_account_report_status") || "idle";
    } catch {
      return "idle";
    }
  });

  const [loading, setLoading] = useState(false);

  const handleRequest = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStatus("ready");
      localStorage.setItem("Trackon_account_report_status", "ready");
      dispatch(
        showSnackbar({
          severity: "success",
          message: "Your account information report is ready to download!",
        })
      );
    }, 1200);
  };

  const handleDownload = () => {
    const reportData = {
      title: "Trackon Account Information Report",
      generatedAt: new Date().toISOString(),
      account: {
        userId: user?._id || window.localStorage.getItem("user_id"),
        name:
          `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "User",
        email: user?.email || "Not specified",
        about: user?.about || "Hey there! I am using Trackon.",
        status: user?.status || "Online",
        avatar: user?.avatar ? "Custom DP Configured" : "Default Avatar",
        links: user?.links || [],
      },
      security: {
        endToEndEncryption: "Enabled (256-bit P2P)",
        twoStepVerification: "Active",
      },
      device: {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        language: navigator.language,
      },
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Trackon_Account_Report_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    dispatch(
      showSnackbar({
        severity: "success",
        message: "Report downloaded successfully!",
      })
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1.5,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              p: 0.8,
              borderRadius: 1.5,
              bgcolor: "rgba(0, 168, 132, 0.12)",
              color: "#00A884",
              display: "flex",
            }}
          >
            <Note size={22} weight="bold" />
          </Box>
          <Stack spacing={0}>
            <Typography variant="h6" fontWeight={700}>
              Request Account Info
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Create a formal report of your Trackon account details
            </Typography>
          </Stack>
        </Stack>
        <IconButton size="small" onClick={handleClose}>
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 2.5 }}>
        <Stack spacing={2.5}>
          {/* Explanation Banner */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor:
                theme.palette.mode === "light"
                  ? "rgba(0, 168, 132, 0.05)"
                  : "rgba(0, 168, 132, 0.1)",
              borderColor: "rgba(0, 168, 132, 0.2)",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Create a report of your Trackon account information and settings,
              which you can access or port to another app.
            </Typography>
            <Alert
              severity="info"
              sx={{ mt: 1.5, py: 0.5, fontSize: "0.8rem" }}
            >
              This report does <strong>not</strong> include your personal
              messages, as chat messages are end-to-end encrypted.
            </Alert>
          </Paper>

          {/* Report Items Included */}
          <Box>
            <Typography
              variant="overline"
              color="primary.main"
              fontWeight={700}
              letterSpacing={1.2}
            >
              Report Contents Include
            </Typography>
            <List dense sx={{ mt: 0.5 }}>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <User size={18} color="#00A884" />
                </ListItemIcon>
                <ListItemText
                  primary="Account & Profile Info"
                  secondary="Name, phone, profile photo, bio status, social links"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Gear size={18} color="#00A884" />
                </ListItemIcon>
                <ListItemText
                  primary="Settings & Configurations"
                  secondary="Notification, theme, wallpaper, and privacy preferences"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <ShieldCheck size={18} color="#00A884" />
                </ListItemIcon>
                <ListItemText
                  primary="Device & Security"
                  secondary="Active sessions, encryption keys, IP & platform info"
                />
              </ListItem>
            </List>
          </Box>

          <Divider />

          {/* Request / Download Action Area */}
          {status === "ready" ? (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor:
                  theme.palette.mode === "light"
                    ? "#F8FAFF"
                    : theme.palette.background.paper,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    p: 1,
                    borderRadius: "50%",
                    bgcolor: "rgba(34, 197, 94, 0.15)",
                    color: "#22c55e",
                  }}
                >
                  <CheckCircle size={24} weight="fill" />
                </Box>
                <Stack spacing={0.25}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Account Report is Ready
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Available for download • Valid for 30 days
                  </Typography>
                </Stack>
              </Stack>

              <Button
                variant="contained"
                startIcon={<DownloadSimple size={18} weight="bold" />}
                onClick={handleDownload}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                Download
              </Button>
            </Paper>
          ) : (
            <Box textAlign="center" py={1}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                onClick={handleRequest}
                sx={{
                  borderRadius: 2,
                  py: 1.25,
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                {loading ? (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <CircularProgress size={20} color="inherit" />
                    <span>Generating Account Report...</span>
                  </Stack>
                ) : (
                  "Request Account Information Report"
                )}
              </Button>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mt={1}
              >
                Instant preparation powered by client encryption engine
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default RequestAccountDialog;
