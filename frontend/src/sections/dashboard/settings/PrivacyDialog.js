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
  Select,
  MenuItem,
  FormControl,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  useTheme,
} from "@mui/material";
import { Lock, X, Prohibit, Clock } from "phosphor-react";
import { useDispatch } from "react-redux";
import { showSnackbar } from "../../../redux/slices/app";

const DEFAULT_PRIVACY = {
  lastSeen: "Everyone",
  online: "Everyone",
  profilePhoto: "Everyone",
  about: "Everyone",
  readReceipts: true,
  disappearingTimer: "Off",
  groups: "Everyone",
  blockedContacts: [],
};

const PrivacyDialog = ({ open, handleClose }) => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const [privacy, setPrivacy] = useState(() => {
    try {
      const saved = localStorage.getItem("Trackon_privacy_settings");
      return saved ? { ...DEFAULT_PRIVACY, ...JSON.parse(saved) } : DEFAULT_PRIVACY;
    } catch {
      return DEFAULT_PRIVACY;
    }
  });

  const handleChange = (field, value) => {
    const updated = { ...privacy, [field]: value };
    setPrivacy(updated);
    localStorage.setItem("Trackon_privacy_settings", JSON.stringify(updated));
  };

  const handleUnblock = (contactName) => {
    const updatedBlocked = privacy.blockedContacts.filter((c) => c !== contactName);
    handleChange("blockedContacts", updatedBlocked);
    dispatch(
      showSnackbar({
        severity: "info",
        message: `Unblocked ${contactName}`,
      })
    );
  };

  const handleSave = () => {
    localStorage.setItem("Trackon_privacy_settings", JSON.stringify(privacy));
    dispatch(
      showSnackbar({
        severity: "success",
        message: "Privacy settings updated successfully!",
      })
    );
    handleClose();
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
            <Lock size={22} weight="bold" />
          </Box>
          <Stack spacing={0}>
            <Typography variant="h6" fontWeight={700}>
              Privacy Settings
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Control who can see your info and activity
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
          {/* Who can see my personal info */}
          <Box>
            <Typography
              variant="overline"
              color="primary.main"
              fontWeight={700}
              letterSpacing={1.2}
            >
              Who can see my personal info
            </Typography>

            <Stack spacing={2} sx={{ mt: 1.5 }}>
              {/* Last Seen */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Stack spacing={0.25}>
                  <Typography variant="subtitle2">Last Seen & Online</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Control who sees your last active timestamp
                  </Typography>
                </Stack>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select
                    value={privacy.lastSeen}
                    onChange={(e) => handleChange("lastSeen", e.target.value)}
                  >
                    <MenuItem value="Everyone">Everyone</MenuItem>
                    <MenuItem value="My Contacts">My Contacts</MenuItem>
                    <MenuItem value="Nobody">Nobody</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Divider light />

              {/* Profile Photo */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Stack spacing={0.25}>
                  <Typography variant="subtitle2">Profile Photo</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Who can see your profile photo
                  </Typography>
                </Stack>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select
                    value={privacy.profilePhoto}
                    onChange={(e) => handleChange("profilePhoto", e.target.value)}
                  >
                    <MenuItem value="Everyone">Everyone</MenuItem>
                    <MenuItem value="My Contacts">My Contacts</MenuItem>
                    <MenuItem value="Nobody">Nobody</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Divider light />

              {/* About */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Stack spacing={0.25}>
                  <Typography variant="subtitle2">About / Bio</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Who can read your bio and status text
                  </Typography>
                </Stack>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select
                    value={privacy.about}
                    onChange={(e) => handleChange("about", e.target.value)}
                  >
                    <MenuItem value="Everyone">Everyone</MenuItem>
                    <MenuItem value="My Contacts">My Contacts</MenuItem>
                    <MenuItem value="Nobody">Nobody</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Stack>
          </Box>

          <Divider />

          {/* Read Receipts */}
          <Box>
            <Typography
              variant="overline"
              color="primary.main"
              fontWeight={700}
              letterSpacing={1.2}
            >
              Messaging Privacy
            </Typography>

            <Stack spacing={2} sx={{ mt: 1.5 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Stack spacing={0.25} sx={{ pr: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle2">Read Receipts (Blue Ticks)</Typography>
                    <Chip
                      size="small"
                      label={privacy.readReceipts ? "Active" : "Off"}
                      color={privacy.readReceipts ? "primary" : "default"}
                      sx={{ height: 20, fontSize: "0.7rem" }}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    If turned off, you won't send or receive read receipts. Read
                    receipts are always sent for group chats.
                  </Typography>
                </Stack>
                <Switch
                  checked={privacy.readReceipts}
                  onChange={(e) => handleChange("readReceipts", e.target.checked)}
                />
              </Stack>

              <Divider light />

              {/* Default message timer */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Stack spacing={0.25}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Clock size={16} />
                    <Typography variant="subtitle2">
                      Default Message Timer
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Start new chats with disappearing messages
                  </Typography>
                </Stack>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select
                    value={privacy.disappearingTimer}
                    onChange={(e) =>
                      handleChange("disappearingTimer", e.target.value)
                    }
                  >
                    <MenuItem value="Off">Off</MenuItem>
                    <MenuItem value="24 Hours">24 Hours</MenuItem>
                    <MenuItem value="7 Days">7 Days</MenuItem>
                    <MenuItem value="90 Days">90 Days</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Divider light />

              {/* Groups */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Stack spacing={0.25}>
                  <Typography variant="subtitle2">Groups</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Who can add you to group chats
                  </Typography>
                </Stack>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select
                    value={privacy.groups}
                    onChange={(e) => handleChange("groups", e.target.value)}
                  >
                    <MenuItem value="Everyone">Everyone</MenuItem>
                    <MenuItem value="My Contacts">My Contacts</MenuItem>
                    <MenuItem value="Nobody">Nobody</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Stack>
          </Box>

          <Divider />

          {/* Blocked Contacts */}
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Stack spacing={0.25}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Blocked Contacts ({privacy.blockedContacts?.length || 0})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Blocked contacts cannot call or send messages to you
                </Typography>
              </Stack>
              <Prohibit size={22} color="#EF4444" />
            </Stack>

            {privacy.blockedContacts && privacy.blockedContacts.length > 0 ? (
              <List dense sx={{ mt: 1 }}>
                {privacy.blockedContacts.map((contact, idx) => (
                  <ListItem
                    key={idx}
                    sx={{
                      bgcolor:
                        theme.palette.mode === "light"
                          ? "#F8FAFF"
                          : "rgba(255, 255, 255, 0.04)",
                      borderRadius: 1.5,
                      mb: 0.5,
                    }}
                  >
                    <ListItemText primary={contact} />
                    <ListItemSecondaryAction>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleUnblock(contact)}
                      >
                        Unblock
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info" sx={{ mt: 1, py: 0.5, fontSize: "0.8rem" }}>
                No blocked contacts. You can block any contact from their chat profile.
              </Alert>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          Save Privacy
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrivacyDialog;
