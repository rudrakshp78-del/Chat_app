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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
  Tabs,
  Tab,
  useTheme,
} from "@mui/material";
import {
  Info,
  X,
  CaretDown,
  PaperPlaneTilt,
  Question,
  ShieldCheck,
  Headset,
} from "phosphor-react";
import { useDispatch } from "react-redux";
import { showSnackbar } from "../../../redux/slices/app";

const FAQS = [
  {
    q: "How does the Status feature work?",
    a: "Status allows you to share text, photos, or videos that disappear after 24 hours. Your contacts can view your status, and you can see who has viewed your updates in real time.",
  },
  {
    q: "Are my messages and calls secure?",
    a: "Yes! All direct communications are protected by end-to-end encryption. Only you and the person you're communicating with can read or listen to them.",
  },
  {
    q: "How do I customize my Chat Wallpaper?",
    a: "Go to Settings > Chat Wallpaper. You can select classic WhatsApp doodles, 12 curated solid colors, adjust wallpaper dimming, or upload any photo from your device gallery.",
  },
  {
    q: "How do Desktop Notifications work outside the app?",
    a: "Go to Settings > Notifications and click 'Enable'. When allowed, you'll receive native system banners and sound chimes whenever a new message arrives, even if you are on another tab.",
  },
  {
    q: "How do Voice and Video calls connect?",
    a: "Voice and video calls use real-time WebRTC technology for crystal-clear, low-latency audio and HD video without requiring third-party plugins.",
  },
];

const HelpDialog = ({ open, handleClose }) => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const [tabIndex, setTabIndex] = useState(0);
  const [issueCategory, setIssueCategory] = useState("general");
  const [issueText, setIssueText] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const handleSubmitFeedback = () => {
    if (!issueText.trim()) {
      dispatch(
        showSnackbar({
          severity: "warning",
          message: "Please describe your issue or suggestion",
        })
      );
      return;
    }

    setIsSubmitted(true);
    dispatch(
      showSnackbar({
        severity: "success",
        message: "Thank you! Your feedback has been sent to our support team.",
      })
    );
    setTimeout(() => {
      setIssueText("");
      setIsSubmitted(false);
      handleClose();
    }, 1500);
  };

  const handleCheckUpdate = () => {
    setCheckingUpdate(true);
    setTimeout(() => {
      setCheckingUpdate(false);
      dispatch(
        showSnackbar({
          severity: "info",
          message: "You are using the latest version of WhatsApp (v2.5.0)",
        })
      );
    }, 800);
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
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
            <Info size={22} weight="bold" />
          </Box>
          <Stack spacing={0}>
            <Typography variant="h6" fontWeight={700}>
              Help & Support Center
            </Typography>
            <Typography variant="caption" color="text.secondary">
              FAQs, contact support, and app information
            </Typography>
          </Stack>
        </Stack>
        <IconButton size="small" onClick={handleClose}>
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}>
        <Tabs
          value={tabIndex}
          onChange={(_, val) => setTabIndex(val)}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab
            label="FAQs"
            icon={<Question size={18} />}
            iconPosition="start"
            sx={{ textTransform: "none", minHeight: 44, fontWeight: 600 }}
          />
          <Tab
            label="Contact Us"
            icon={<Headset size={18} />}
            iconPosition="start"
            sx={{ textTransform: "none", minHeight: 44, fontWeight: 600 }}
          />
          <Tab
            label="App Info"
            icon={<Info size={18} />}
            iconPosition="start"
            sx={{ textTransform: "none", minHeight: 44, fontWeight: 600 }}
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ py: 2.5 }}>
        {/* ================= TAB 0: FAQS ================= */}
        {tabIndex === 0 && (
          <Stack spacing={1.5}>
            <Typography variant="caption" color="text.secondary">
              Frequently asked questions about WhatsApp features:
            </Typography>
            {FAQS.map((faq, idx) => (
              <Accordion
                key={idx}
                disableGutters
                elevation={0}
                sx={{
                  border: "1px solid",
                  borderColor: theme.palette.divider,
                  borderRadius: "10px !important",
                  "&:before": { display: "none" },
                  mb: 1,
                }}
              >
                <AccordionSummary expandIcon={<CaretDown size={18} />}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {faq.q}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Typography variant="body2" color="text.secondary">
                    {faq.a}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        )}

        {/* ================= TAB 1: CONTACT US ================= */}
        {tabIndex === 1 && (
          <Stack spacing={2.5}>
            <Typography variant="body2" color="text.secondary">
              Encountered a problem or have an idea to improve WhatsApp? Tell us
              about it below:
            </Typography>

            <FormControl size="small" fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={issueCategory}
                label="Category"
                onChange={(e) => setIssueCategory(e.target.value)}
              >
                <MenuItem value="general">General Feedback</MenuItem>
                <MenuItem value="chat">Chat & Messaging</MenuItem>
                <MenuItem value="calls">Audio / Video Calling</MenuItem>
                <MenuItem value="status">Status & Media</MenuItem>
                <MenuItem value="notifications">Notifications & Sounds</MenuItem>
                <MenuItem value="other">Other Issue</MenuItem>
              </Select>
            </FormControl>

            <TextField
              multiline
              rows={4}
              label="Describe your issue or suggestion"
              placeholder="Please provide details so we can assist you..."
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              fullWidth
            />

            <Button
              variant="contained"
              size="large"
              startIcon={<PaperPlaneTilt size={18} weight="bold" />}
              onClick={handleSubmitFeedback}
              disabled={isSubmitted}
              sx={{ borderRadius: 2, textTransform: "none" }}
            >
              {isSubmitted ? "Feedback Sent!" : "Submit Feedback"}
            </Button>
          </Stack>
        )}

        {/* ================= TAB 2: APP INFO ================= */}
        {tabIndex === 2 && (
          <Stack spacing={2.5}>
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                textAlign: "center",
                bgcolor:
                  theme.palette.mode === "light"
                    ? "#F8FAFF"
                    : theme.palette.background.paper,
              }}
            >
              <Typography variant="h6" fontWeight={700}>
                Tawk Web
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Version 2.5.0 (Latest Release)
              </Typography>
              <Chip
                label="End-to-End Encrypted"
                color="success"
                size="small"
                icon={<ShieldCheck size={16} />}
                sx={{ mt: 1.5, fontWeight: 600 }}
              />
            </Paper>

            <Stack spacing={1}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="body2">Server Connection</Typography>
                <Chip size="small" label="Connected • Online" color="success" />
              </Stack>
              <Divider light />
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="body2">WebRTC Video Engine</Typography>
                <Typography variant="caption" color="text.secondary">
                  Ready (ZegoCloud 3.12)
                </Typography>
              </Stack>
              <Divider light />
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="body2">Audio Engine</Typography>
                <Typography variant="caption" color="text.secondary">
                  HTML5 WebAudio API
                </Typography>
              </Stack>
            </Stack>

            <Button
              variant="outlined"
              onClick={handleCheckUpdate}
              disabled={checkingUpdate}
              sx={{ borderRadius: 2, textTransform: "none" }}
            >
              {checkingUpdate ? "Checking..." : "Check for Updates"}
            </Button>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HelpDialog;
