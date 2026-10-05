import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Switch,
  IconButton,
  Divider,
  Box,
  TextField,
  Chip,
  Paper,
  useTheme,
} from "@mui/material";
import {
  ShieldCheck,
  Key,
  DeviceMobile,
  Lock,
  X,
  SignOut,
} from "phosphor-react";
import { useDispatch } from "react-redux";
import { showSnackbar } from "../../../redux/slices/app";

const DEFAULT_SECURITY = {
  securityNotifications: true,
  twoStepEnabled: false,
  twoStepPin: "",
  appLockTimeout: "15 minutes",
};

const SecurityDialog = ({ open, handleClose }) => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const [security, setSecurity] = useState(() => {
    try {
      const saved = localStorage.getItem("Trackon_security_settings");
      return saved ? { ...DEFAULT_SECURITY, ...JSON.parse(saved) } : DEFAULT_SECURITY;
    } catch {
      return DEFAULT_SECURITY;
    }
  });

  const [pinInput, setPinInput] = useState("");
  const [showPinSetup, setShowPinSetup] = useState(false);

  const handleToggle = (field) => {
    const updated = { ...security, [field]: !security[field] };
    setSecurity(updated);
    localStorage.setItem("Trackon_security_settings", JSON.stringify(updated));
  };

  const handleSavePin = () => {
    if (pinInput.length !== 6 || !/^\d+$/.test(pinInput)) {
      dispatch(
        showSnackbar({
          severity: "warning",
          message: "Please enter a valid 6-digit numeric PIN",
        })
      );
      return;
    }

    const updated = {
      ...security,
      twoStepEnabled: true,
      twoStepPin: pinInput,
    };
    setSecurity(updated);
    localStorage.setItem("Trackon_security_settings", JSON.stringify(updated));
    setShowPinSetup(false);
    setPinInput("");
    dispatch(
      showSnackbar({
        severity: "success",
        message: "Two-step verification PIN enabled!",
      })
    );
  };

  const handleDisablePin = () => {
    const updated = {
      ...security,
      twoStepEnabled: false,
      twoStepPin: "",
    };
    setSecurity(updated);
    localStorage.setItem("Trackon_security_settings", JSON.stringify(updated));
    dispatch(
      showSnackbar({
        severity: "info",
        message: "Two-step verification disabled",
      })
    );
  };

  const handleLogoutOtherSessions = () => {
    dispatch(
      showSnackbar({
        severity: "success",
        message: "Logged out from all other active sessions",
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
            <ShieldCheck size={22} weight="bold" />
          </Box>
          <Stack spacing={0}>
            <Typography variant="h6" fontWeight={700}>
              Security & Encryption
            </Typography>
            <Typography variant="caption" color="text.secondary">
              End-to-end encryption and account protection
            </Typography>
          </Stack>
        </Stack>
        <IconButton size="small" onClick={handleClose}>
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 2.5 }}>
        <Stack spacing={3}>
          {/* Encryption Banner */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor:
                theme.palette.mode === "light"
                  ? "rgba(0, 168, 132, 0.06)"
                  : "rgba(0, 168, 132, 0.12)",
              borderColor: "rgba(0, 168, 132, 0.3)",
            }}
          >
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Box
                sx={{
                  bgcolor: "#00A884",
                  color: "#fff",
                  p: 1,
                  borderRadius: "50%",
                  display: "flex",
                }}
              >
                <Lock size={20} weight="bold" />
              </Box>
              <Stack spacing={0.5}>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  color="#00A884"
                >
                  End-to-End Encrypted
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: "0.85rem" }}
                >
                  Your messages, voice notes, photos, and calls are secured with
                  peer-to-peer 256-bit encryption. Neither Trackon nor third
                  parties can read or listen to them.
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          {/* Show Security Notifications */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack spacing={0.25} sx={{ pr: 2 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                Show Security Notifications
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Get notified when your security code changes for a contact's
                phone in an end-to-end encrypted chat.
              </Typography>
            </Stack>
            <Switch
              checked={security.securityNotifications}
              onChange={() => handleToggle("securityNotifications")}
            />
          </Stack>

          <Divider />

          {/* Two-Step Verification */}
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Stack spacing={0.25}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Key size={18} />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Two-Step Verification
                  </Typography>
                  <Chip
                    size="small"
                    label={security.twoStepEnabled ? "Enabled" : "Disabled"}
                    color={security.twoStepEnabled ? "success" : "default"}
                    sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600 }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  For added security, enable a 6-digit PIN required when
                  registering your account.
                </Typography>
              </Stack>

              {security.twoStepEnabled ? (
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  onClick={handleDisablePin}
                  sx={{ textTransform: "none", borderRadius: 1.5 }}
                >
                  Turn Off
                </Button>
              ) : (
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => setShowPinSetup(true)}
                  sx={{ textTransform: "none", borderRadius: 1.5 }}
                >
                  Enable PIN
                </Button>
              )}
            </Stack>

            {/* PIN Setup Input */}
            {showPinSetup && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor:
                    theme.palette.mode === "light"
                      ? "#F8FAFF"
                      : "rgba(255,255,255,0.05)",
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={600}
                  display="block"
                  mb={1}
                >
                  Create a 6-Digit Security PIN:
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <TextField
                    size="small"
                    type="password"
                    placeholder="123456"
                    value={pinInput}
                    onChange={(e) => {
                      if (e.target.value.length <= 6) {
                        setPinInput(e.target.value);
                      }
                    }}
                    inputProps={{
                      maxLength: 6,
                      style: { letterSpacing: 4, textAlign: "center" },
                    }}
                    sx={{ width: 140 }}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSavePin}
                    disabled={pinInput.length !== 6}
                  >
                    Save PIN
                  </Button>
                  <Button size="small" onClick={() => setShowPinSetup(false)}>
                    Cancel
                  </Button>
                </Stack>
              </Box>
            )}
          </Box>

          <Divider />

          {/* Active Devices & Web Sessions */}
          <Box>
            <Typography
              variant="overline"
              color="primary.main"
              fontWeight={700}
              letterSpacing={1.2}
            >
              Active Web Sessions
            </Typography>

            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mt: 1,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: "rgba(0, 168, 132, 0.1)",
                    color: "#00A884",
                  }}
                >
                  <DeviceMobile size={22} />
                </Box>
                <Stack spacing={0.25}>
                  <Typography variant="subtitle2">
                    Windows • Chrome (Current Device)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active now • Local connection
                  </Typography>
                </Stack>
              </Stack>
              <Chip
                size="small"
                label="This Device"
                color="primary"
                variant="outlined"
              />
            </Paper>

            <Button
              variant="text"
              color="error"
              size="small"
              startIcon={<SignOut size={16} />}
              onClick={handleLogoutOtherSessions}
              sx={{ mt: 1.5, textTransform: "none" }}
            >
              Log out from all other devices
            </Button>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SecurityDialog;
