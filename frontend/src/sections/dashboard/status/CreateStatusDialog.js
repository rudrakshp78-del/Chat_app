import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Box,
  Typography,
  IconButton,
  TextField,
  Tabs,
  Tab,
  Tooltip,
  CircularProgress,
  Popover,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Camera,
  Image as ImageIcon,
  PaperPlaneTilt,
  Smiley,
  TextT,
  Trash,
  X,
  Palette,
} from "phosphor-react";
import { useDispatch, useSelector } from "react-redux";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { CreateStatus } from "../../../redux/slices/status";

// WhatsApp signature color and gradient presets
const COLOR_PRESETS = [
  { label: "Teal", value: "#00a884" },
  { label: "Deep Teal", value: "#005c4b" },
  { label: "Purple", value: "#512da8" },
  { label: "Crimson", value: "#b71c1c" },
  { label: "Coral", value: "#d81b60" },
  { label: "Blue", value: "#1565c0" },
  {
    label: "Sunset",
    value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  },
  {
    label: "Ocean",
    value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  },
  {
    label: "Emerald",
    value: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  },
  { label: "Midnight", value: "#1e293b" },
];

const FONT_PRESETS = [
  { label: "Normal", value: "Roboto, sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Casual", value: "'Comic Sans MS', 'Brush Script MT', cursive" },
  { label: "Mono", value: "'Courier New', Courier, monospace" },
];

const CreateStatusDialog = ({ open, handleClose, initialTab = 0 }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const { isLoading } = useSelector((state) => state.status);

  const [tab, setTab] = useState(initialTab); // 0: Text, 1: Photo
  const [content, setContent] = useState("");
  const [background, setBackground] = useState(COLOR_PRESETS[0].value);
  const [fontIndex, setFontIndex] = useState(0);

  // Photo status state
  const [imagePreview, setImagePreview] = useState("");
  const [caption, setCaption] = useState("");

  // Emoji picker anchor
  const [emojiAnchor, setEmojiAnchor] = useState(null);

  const resetForm = () => {
    setContent("");
    setBackground(COLOR_PRESETS[0].value);
    setFontIndex(0);
    setImagePreview("");
    setCaption("");
    setEmojiAnchor(null);
  };

  const onClose = () => {
    resetForm();
    handleClose();
  };

  // Switch font preset
  const handleCycleFont = () => {
    setFontIndex((prev) => (prev + 1) % FONT_PRESETS.length);
  };

  // Switch color preset
  const handleCycleColor = () => {
    const currentIndex = COLOR_PRESETS.findIndex((c) => c.value === background);
    const nextIndex = (currentIndex + 1) % COLOR_PRESETS.length;
    setBackground(COLOR_PRESETS[nextIndex].value);
  };

  // Image file select handler
  const handleImageSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Check size limit: max 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert("Image size should be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle emoji select
  const handleEmojiSelect = (emoji) => {
    if (tab === 0) {
      setContent((prev) => prev + emoji.native);
    } else {
      setCaption((prev) => prev + emoji.native);
    }
  };

  // Submit Status
  const handleSubmit = async () => {
    if (tab === 0) {
      // Text status
      if (!content.trim()) return;

      await dispatch(
        CreateStatus({
          type: "text",
          content: content.trim(),
          background,
          fontFamily: FONT_PRESETS[fontIndex].value,
        })
      );
    } else {
      // Photo status
      if (!imagePreview) return;

      await dispatch(
        CreateStatus({
          type: "image",
          media: imagePreview,
          content: caption.trim(),
        })
      );
    }

    onClose();
  };

  const isSubmitDisabled =
    isLoading || (tab === 0 ? !content.trim() : !imagePreview);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          Create New Status
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
        <Tabs
          value={tab}
          onChange={(e, val) => setTab(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab
            icon={<TextT size={20} />}
            iconPosition="start"
            label="Type a Status"
          />
          <Tab
            icon={<Camera size={20} />}
            iconPosition="start"
            label="Photo Status"
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 2 }}>
        {tab === 0 ? (
          /* =================================================================
             TEXT STATUS COMPOSER
             ================================================================= */
          <Stack spacing={2}>
            {/* Live WhatsApp Status Preview Canvas */}
            <Box
              sx={{
                width: "100%",
                height: 280,
                borderRadius: 2,
                background: background,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 3,
                boxSizing: "border-box",
                position: "relative",
                boxShadow: "inset 0 0 20px rgba(0,0,0,0.15)",
                overflow: "hidden",
              }}
            >
              <TextField
                multiline
                rows={4}
                fullWidth
                variant="standard"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type a status..."
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    color: "#ffffff",
                    textAlign: "center",
                    fontSize: { xs: "1.2rem", sm: "1.5rem" },
                    fontWeight: 500,
                    fontFamily: FONT_PRESETS[fontIndex].value,
                    lineHeight: 1.4,
                    textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                    "& textarea": {
                      textAlign: "center !important",
                      color: "#ffffff",
                    },
                    "& textarea::placeholder": {
                      color: "rgba(255,255,255,0.7)",
                      opacity: 1,
                    },
                  },
                }}
              />

              {/* Status Toolbar inside canvas (Palette, Font, Emoji) */}
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                }}
              >
                <Tooltip title="Cycle Background Color">
                  <IconButton
                    size="small"
                    onClick={handleCycleColor}
                    sx={{
                      bgcolor: "rgba(0,0,0,0.35)",
                      color: "#ffffff",
                      "&:hover": { bgcolor: "rgba(0,0,0,0.55)" },
                    }}
                  >
                    <Palette size={18} />
                  </IconButton>
                </Tooltip>

                <Tooltip title={`Font: ${FONT_PRESETS[fontIndex].label}`}>
                  <IconButton
                    size="small"
                    onClick={handleCycleFont}
                    sx={{
                      bgcolor: "rgba(0,0,0,0.35)",
                      color: "#ffffff",
                      "&:hover": { bgcolor: "rgba(0,0,0,0.55)" },
                    }}
                  >
                    <TextT size={18} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>

            {/* Quick Color Palette Swatches */}
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                Select Background Color
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  overflowX: "auto",
                  pb: 0.5,
                  "&::-webkit-scrollbar": { height: 4 },
                }}
              >
                {COLOR_PRESETS.map((preset) => {
                  const isSelected = background === preset.value;
                  return (
                    <Box
                      key={preset.label}
                      onClick={() => setBackground(preset.value)}
                      sx={{
                        width: 28,
                        height: 28,
                        minWidth: 28,
                        borderRadius: "50%",
                        background: preset.value,
                        cursor: "pointer",
                        border: isSelected
                          ? "2.5px solid #25D366"
                          : "2px solid transparent",
                        boxShadow: isSelected
                          ? "0 0 6px rgba(37, 211, 102, 0.6)"
                          : "none",
                        transition: "all 0.15s ease",
                        "&:hover": { transform: "scale(1.15)" },
                      }}
                    />
                  );
                })}
              </Stack>
            </Stack>

            {/* Emoji & Font Selector row */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Button
                size="small"
                variant="outlined"
                startIcon={<Smiley size={18} />}
                onClick={(e) => setEmojiAnchor(e.currentTarget)}
              >
                Add Emoji
              </Button>

              <Typography variant="caption" color="text.secondary">
                Disappears in 24 hours
              </Typography>
            </Stack>
          </Stack>
        ) : (
          /* =================================================================
             PHOTO STATUS COMPOSER
             ================================================================= */
          <Stack spacing={2}>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleImageSelect}
            />

            {!imagePreview ? (
              <Box
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  width: "100%",
                  height: 240,
                  borderRadius: 2,
                  border: `2px dashed ${theme.palette.primary.main}`,
                  bgcolor: (theme) =>
                    theme.palette.mode === "light" ? "#F8FAFF" : "#1A202C",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  p: 3,
                  transition: "background-color 0.2s",
                  "&:hover": {
                    bgcolor: (theme) =>
                      theme.palette.mode === "light" ? "#EFF4FE" : "#232b3b",
                  },
                }}
              >
                <ImageIcon size={52} color={theme.palette.primary.main} />
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>
                  Click to choose a photo
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  PNG, JPG, GIF up to 10MB
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  height: 260,
                  borderRadius: 2,
                  overflow: "hidden",
                  bgcolor: "#000000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={imagePreview}
                  alt="Status Preview"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />

                {/* Change photo button */}
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                  }}
                >
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      bgcolor: "rgba(0,0,0,0.6)",
                      "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
                    }}
                  >
                    Change
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setImagePreview("");
                    }}
                    sx={{
                      bgcolor: "rgba(220,38,38,0.8)",
                      color: "#fff",
                      "&:hover": { bgcolor: "rgba(220,38,38,1)" },
                    }}
                  >
                    <Trash size={16} />
                  </IconButton>
                </Stack>
              </Box>
            )}

            {/* Caption Input with Emoji */}
            {imagePreview && (
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                placeholder="Add a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      size="small"
                      onClick={(e) => setEmojiAnchor(e.currentTarget)}
                    >
                      <Smiley size={20} />
                    </IconButton>
                  ),
                }}
              />
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        <Button onClick={onClose} color="inherit" disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          startIcon={
            isLoading ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <PaperPlaneTilt size={18} />
            )
          }
          sx={{
            bgcolor: "#25D366",
            "&:hover": { bgcolor: "#1ebd58" },
            color: "#ffffff",
            fontWeight: "bold",
            px: 3,
          }}
        >
          {isLoading ? "Posting..." : "Share to Everyone"}
        </Button>
      </DialogActions>

      {/* Emoji Picker Popover */}
      <Popover
        open={Boolean(emojiAnchor)}
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <Picker
          data={data}
          onEmojiSelect={handleEmojiSelect}
          theme={theme.palette.mode}
        />
      </Popover>
    </Dialog>
  );
};

export default CreateStatusDialog;
