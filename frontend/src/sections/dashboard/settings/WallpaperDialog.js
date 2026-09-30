import React, { useRef, useState } from "react";
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
  Switch,
  Slider,
  Tooltip,
  useTheme,
} from "@mui/material";
import {
  Image as ImageIcon,
  X,
  Check,
  ArrowCounterClockwise,
  UploadSimple,
  Sparkle,
} from "phosphor-react";
import { useDispatch } from "react-redux";
import { showSnackbar } from "../../../redux/slices/app";
import {
  WALLPAPER_COLORS,
  WHATSAPP_DOODLE_SVG,
  DEFAULT_WALLPAPER,
  getSavedWallpaper,
  saveWallpaper,
} from "../../../utils/wallpaperHelpers";
import { compressImage } from "../../../utils/profileHelpers";

const WallpaperDialog = ({ open, handleClose }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const [wallpaper, setWallpaper] = useState(getSavedWallpaper());
  const [isUploading, setIsUploading] = useState(false);

  const isDarkMode = theme.palette.mode === "dark";

  // Select solid color
  const handleSelectColor = (item) => {
    const selectedColor = isDarkMode ? item.darkColor : item.color;
    setWallpaper((prev) => ({
      ...prev,
      type: "solid",
      color: selectedColor,
      imageUrl: "",
    }));
  };

  // Upload custom photo from gallery
  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      dispatch(
        showSnackbar({
          severity: "warning",
          message: "Please choose an image file (JPG, PNG, WEBP)",
        })
      );
      return;
    }

    try {
      setIsUploading(true);
      const dataUrl = await compressImage(file, 800, 800, 0.85);
      setWallpaper((prev) => ({
        ...prev,
        type: "image",
        imageUrl: dataUrl,
      }));
      dispatch(
        showSnackbar({
          severity: "info",
          message: "Custom image loaded into preview!",
        })
      );
    } catch (err) {
      console.error(err);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to read image",
        })
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Reset to default
  const handleReset = () => {
    setWallpaper(DEFAULT_WALLPAPER);
  };

  // Apply
  const handleApply = () => {
    saveWallpaper(wallpaper);
    dispatch(
      showSnackbar({
        severity: "success",
        message: "Chat wallpaper updated for all conversations!",
      })
    );
    handleClose();
  };

  // Determine preview background styling
  const getPreviewBgStyle = () => {
    const baseColor =
      wallpaper.type === "solid"
        ? wallpaper.color
        : isDarkMode
        ? "#0B141A"
        : "#EFEAE2";

    if (wallpaper.type === "image" && wallpaper.imageUrl) {
      return {
        backgroundImage: `url(${wallpaper.imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }

    if (wallpaper.overlayDoodles) {
      return {
        backgroundColor: baseColor,
        backgroundImage: `url("${WHATSAPP_DOODLE_SVG}")`,
        backgroundRepeat: "repeat",
      };
    }

    return {
      backgroundColor: baseColor,
    };
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

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
              <ImageIcon size={22} weight="bold" />
            </Box>
            <Stack spacing={0}>
              <Typography variant="h6" fontWeight={700}>
                Chat Wallpaper Studio
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Set custom background colors, WhatsApp doodles, or gallery photos
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
            {/* Live Chat Preview */}
            <Box
              sx={{
                position: "relative",
                borderRadius: 3,
                overflow: "hidden",
                border: "2px solid",
                borderColor: theme.palette.divider,
                height: 180,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                p: 2,
                ...getPreviewBgStyle(),
              }}
            >
              {/* Dimming overlay */}
              {wallpaper.dimming > 0 && (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    bgcolor: `rgba(0, 0, 0, ${wallpaper.dimming / 100})`,
                    pointerEvents: "none",
                  }}
                />
              )}

              {/* Chat bubbles */}
              <Stack spacing={1.5} sx={{ position: "relative", zIndex: 1 }}>
                {/* Incoming bubble */}
                <Box
                  sx={{
                    alignSelf: "flex-start",
                    bgcolor: isDarkMode ? "#202C33" : "#FFFFFF",
                    color: isDarkMode ? "#E9EDEF" : "#111B21",
                    px: 1.75,
                    py: 1,
                    borderRadius: "12px 12px 12px 0px",
                    maxWidth: "75%",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                    fontSize: "0.85rem",
                  }}
                >
                  Hey! How does this chat wallpaper look? 🎨
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      textAlign: "right",
                      fontSize: "0.65rem",
                      color: "text.secondary",
                      mt: 0.25,
                    }}
                  >
                    10:45 AM
                  </Typography>
                </Box>

                {/* Outgoing bubble */}
                <Box
                  sx={{
                    alignSelf: "flex-end",
                    bgcolor: isDarkMode ? "#005C4B" : "#D9FDD3",
                    color: isDarkMode ? "#E9EDEF" : "#111B21",
                    px: 1.75,
                    py: 1,
                    borderRadius: "12px 12px 0px 12px",
                    maxWidth: "75%",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                    fontSize: "0.85rem",
                  }}
                >
                  It looks awesome! Just like WhatsApp! 🚀
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      textAlign: "right",
                      fontSize: "0.65rem",
                      color: "#00A884",
                      mt: 0.25,
                      fontWeight: 600,
                    }}
                  >
                    10:46 AM ✓✓
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Quick Actions (Gallery & Reset) */}
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                disabled={isUploading}
                startIcon={<UploadSimple size={18} />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ textTransform: "none", borderRadius: 2, flex: 1 }}
              >
                {isUploading ? "Loading Image..." : "Choose from Gallery"}
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<ArrowCounterClockwise size={18} />}
                onClick={handleReset}
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                Default
              </Button>
            </Stack>

            <Divider />

            {/* Solid Colors Palette */}
            <Box>
              <Typography
                variant="overline"
                color="primary.main"
                fontWeight={700}
                letterSpacing={1.2}
              >
                WhatsApp Solid Colors
              </Typography>
              <Stack
                direction="row"
                flexWrap="wrap"
                gap={1.5}
                sx={{ mt: 1.5, justifyContent: "space-between" }}
              >
                {WALLPAPER_COLORS.map((item) => {
                  const targetColor = isDarkMode ? item.darkColor : item.color;
                  const isSelected =
                    wallpaper.type === "solid" && wallpaper.color === targetColor;

                  return (
                    <Tooltip key={item.name} title={item.name}>
                      <Box
                        onClick={() => handleSelectColor(item)}
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 2,
                          bgcolor: targetColor,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "2px solid",
                          borderColor: isSelected
                            ? "#00A884"
                            : theme.palette.divider,
                          boxShadow: isSelected
                            ? "0 0 0 2px #00A884"
                            : "0 1px 3px rgba(0,0,0,0.1)",
                          transition: "all 0.2s ease-in-out",
                          "&:hover": {
                            transform: "scale(1.1)",
                          },
                        }}
                      >
                        {isSelected && (
                          <Check
                            size={18}
                            color={isDarkMode ? "#fff" : "#111"}
                            weight="bold"
                          />
                        )}
                      </Box>
                    </Tooltip>
                  );
                })}
              </Stack>
            </Box>

            <Divider />

            {/* Doodles Overlay & Dimming */}
            <Stack spacing={2.5}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Stack spacing={0.25}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Sparkle size={18} color="#00A884" />
                    <Typography variant="subtitle2" fontWeight={600}>
                      Add WhatsApp Doodles
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Overlay classic WhatsApp doodle graphics on top of the wallpaper
                  </Typography>
                </Stack>
                <Switch
                  checked={wallpaper.overlayDoodles}
                  onChange={(e) =>
                    setWallpaper((prev) => ({
                      ...prev,
                      overlayDoodles: e.target.checked,
                    }))
                  }
                />
              </Stack>

              {/* Wallpaper Dimming Slider */}
              <Box>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={0.5}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    Wallpaper Dimming
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {wallpaper.dimming}%
                  </Typography>
                </Stack>
                <Slider
                  value={wallpaper.dimming}
                  min={0}
                  max={80}
                  step={5}
                  onChange={(_, val) =>
                    setWallpaper((prev) => ({ ...prev, dimming: val }))
                  }
                  sx={{ color: "#00A884" }}
                />
              </Box>
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleApply}>
            Apply to All Chats
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default WallpaperDialog;
