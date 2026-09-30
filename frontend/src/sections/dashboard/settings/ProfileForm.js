import React, { useEffect, useRef, useState } from "react";
import * as Yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import FormProvider from "../../../components/hook-form/FormProvider";
import { RHFTextField } from "../../../components/hook-form";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
  CircularProgress,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { useDispatch, useSelector } from "react-redux";
import {
  UpdateUserProfile,
  FetchUserProfile,
  showSnackbar,
} from "../../../redux/slices/app";
import getAvatarUrl from "../../../utils/getAvatarUrl";
import {
  Camera,
  Trash,
  Plus,
  ArrowSquareOut,
  Image as ImageIcon,
  Check,
} from "phosphor-react";
import {
  PRESET_AVATARS,
  PLATFORM_PRESETS,
  getPlatformInfo,
  renderPlatformIcon,
  compressImage,
} from "../../../utils/profileHelpers";

const ProfileForm = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { user } = useSelector((state) => state.app);

  const fileInputRef = useRef(null);
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [links, setLinks] = useState(Array.isArray(user?.links) ? user.links : []);
  const [anchorEl, setAnchorEl] = useState(null);
  const [openPresetDialog, setOpenPresetDialog] = useState(false);
  const [openLinkDialog, setOpenLinkDialog] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const ProfileSchema = Yup.object().shape({
    firstName: Yup.string().required("Name is required"),
    about: Yup.string().required("About is required"),
  });

  const defaultValues = {
    firstName: user?.firstName || "",
    about: user?.about || "Hey there! I am using WhatsApp.",
  };

  const methods = useForm({
    resolver: yupResolver(ProfileSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = methods;

  const currentFirstName = watch("firstName");

  // Keep form in sync when user data is fetched or updated
  useEffect(() => {
    if (user && Object.keys(user).length > 0) {
      reset({
        firstName: user?.firstName || "",
        about: user?.about || "Hey there! I am using WhatsApp.",
      });
      if (user.avatar !== undefined) {
        setAvatar(user.avatar || "");
      }
      if (Array.isArray(user.links)) {
        setLinks(user.links);
      }
    }
  }, [user, reset]);

  // If user object not loaded yet, fetch it
  useEffect(() => {
    if (!user || !user.firstName) {
      dispatch(FetchUserProfile());
    }
  }, [dispatch, user]);

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  // Gallery file selection
  const handleFileChange = async (event) => {
    handleCloseMenu();
    const file = event.target.files && event.target.files[0];
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
      setIsProcessingImage(true);
      const base64Url = await compressImage(file, 400, 400, 0.85);
      setAvatar(base64Url);
      dispatch(
        showSnackbar({
          severity: "info",
          message: "Photo chosen from gallery! Click 'Save Profile' to save changes.",
        })
      );
    } catch (err) {
      console.error("Failed to read image:", err);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to read photo from device.",
        })
      );
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Select Preset Avatar
  const handleSelectPreset = (presetUrl) => {
    setAvatar(presetUrl);
    setOpenPresetDialog(false);
    dispatch(
      showSnackbar({
        severity: "info",
        message: "Avatar preset selected! Click 'Save Profile' to save changes.",
      })
    );
  };

  // Remove Photo
  const handleRemovePhoto = () => {
    handleCloseMenu();
    setAvatar("");
    dispatch(
      showSnackbar({
        severity: "info",
        message: "Profile photo reset. Click 'Save Profile' to save changes.",
      })
    );
  };

  // Open Add Link Dialog
  const handleOpenAddLink = () => {
    setLinkTitle("");
    setLinkUrl("");
    setOpenLinkDialog(true);
  };

  // Select Platform preset in dialog
  const handleSelectPlatformPreset = (preset) => {
    setLinkTitle(preset.name);
    setLinkUrl(preset.prefix);
  };

  // Add Link to array
  const handleAddLink = () => {
    let url = linkUrl.trim();
    if (!url) {
      dispatch(
        showSnackbar({
          severity: "warning",
          message: "Please enter a valid URL",
        })
      );
      return;
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    const platform = getPlatformInfo(url, linkTitle);
    const title = linkTitle.trim() || platform.name;

    setLinks((prev) => [...prev, { title, url }]);
    setOpenLinkDialog(false);
    setLinkTitle("");
    setLinkUrl("");
  };

  // Delete Link
  const handleDeleteLink = (indexToDelete) => {
    setLinks((prev) => prev.filter((_, idx) => idx !== indexToDelete));
  };

  // Submit Profile Changes
  const onSubmit = async (data) => {
    try {
      setSaving(true);
      await dispatch(
        UpdateUserProfile({
          firstName: data?.firstName,
          about: data?.about,
          avatar: avatar,
          links: links,
        })
      );
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const previewAvatarUrl = getAvatarUrl(avatar, currentFirstName || user?.firstName);

  return (
    <>
      {/* Hidden file input for gallery picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={3.5}>
          {/* ======================================================== */}
          {/* PROFILE DP SECTION */}
          {/* ======================================================== */}
          <Stack alignItems="center" spacing={1.5}>
            <Box sx={{ position: "relative", display: "inline-block" }}>
              <Avatar
                src={previewAvatarUrl}
                alt={currentFirstName || "User"}
                sx={{
                  width: 110,
                  height: 110,
                  boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
                  border: `3px solid ${theme.palette.background.paper}`,
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    opacity: 0.9,
                    transform: "scale(1.02)",
                  },
                }}
                onClick={handleOpenMenu}
              >
                {(currentFirstName || "U").charAt(0).toUpperCase()}
              </Avatar>

              {/* Floating Camera Button */}
              <Tooltip title="Change Profile DP">
                <IconButton
                  onClick={handleOpenMenu}
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    bgcolor: theme.palette.primary.main,
                    color: "#fff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                    "&:hover": {
                      bgcolor: theme.palette.primary.dark,
                    },
                    width: 36,
                    height: 36,
                  }}
                >
                  {isProcessingImage ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <Camera size={20} weight="bold" />
                  )}
                </IconButton>
              </Tooltip>
            </Box>

            {/* Quick Action Buttons for DP */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                variant="outlined"
                startIcon={<ImageIcon size={16} />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ borderRadius: 2, textTransform: "none", fontSize: "0.8rem" }}
              >
                Gallery
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Camera size={16} />}
                onClick={() => setOpenPresetDialog(true)}
                sx={{ borderRadius: 2, textTransform: "none", fontSize: "0.8rem" }}
              >
                Avatars
              </Button>
              {avatar && (
                <Button
                  size="small"
                  color="error"
                  variant="text"
                  startIcon={<Trash size={16} />}
                  onClick={handleRemovePhoto}
                  sx={{ borderRadius: 2, textTransform: "none", fontSize: "0.8rem" }}
                >
                  Remove
                </Button>
              )}
            </Stack>

            <Typography variant="caption" color="text.secondary">
              Upload from gallery or pick an avatar preset
            </Typography>
          </Stack>

          {/* Avatar Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <MenuItem
              onClick={() => {
                handleCloseMenu();
                fileInputRef.current?.click();
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <ImageIcon size={20} />
                <Typography variant="body2">Choose from Gallery</Typography>
              </Stack>
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleCloseMenu();
                setOpenPresetDialog(true);
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Camera size={20} />
                <Typography variant="body2">Choose from Avatar Presets</Typography>
              </Stack>
            </MenuItem>
            {avatar && (
              <MenuItem onClick={handleRemovePhoto} sx={{ color: "error.main" }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Trash size={20} />
                  <Typography variant="body2">Remove Profile Photo</Typography>
                </Stack>
              </MenuItem>
            )}
          </Menu>

          <Divider />

          {/* ======================================================== */}
          {/* USER INFO FIELDS */}
          {/* ======================================================== */}
          <Stack spacing={2.5}>
            <RHFTextField
              name="firstName"
              label="Name"
              placeholder="Your name"
              helperText="This name is visible to your contacts"
            />

            <RHFTextField
              multiline
              rows={3}
              name="about"
              label="About"
              placeholder="Hey there! I am using WhatsApp."
              helperText="Write a status or short bio"
            />
          </Stack>

          <Divider />

          {/* ======================================================== */}
          {/* PROFILE LINKS SECTION */}
          {/* ======================================================== */}
          <Stack spacing={1.5}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="subtitle1" fontWeight={600}>
                Links ({links.length})
              </Typography>
              <Button
                size="small"
                variant="contained"
                startIcon={<Plus size={16} weight="bold" />}
                onClick={handleOpenAddLink}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  px: 1.5,
                  py: 0.5,
                  fontSize: "0.825rem",
                }}
              >
                Add Link
              </Button>
            </Stack>

            {/* Links List */}
            {links.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  textAlign: "center",
                  borderRadius: 2,
                  borderStyle: "dashed",
                  bgcolor:
                    theme.palette.mode === "light"
                      ? "rgba(0, 168, 132, 0.04)"
                      : "rgba(255, 255, 255, 0.02)",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No links added yet.
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                  Add your Instagram, GitHub, LinkedIn, portfolio or website.
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  startIcon={<Plus size={14} />}
                  onClick={handleOpenAddLink}
                  sx={{ mt: 1, textTransform: "none" }}
                >
                  Add your first link
                </Button>
              </Paper>
            ) : (
              <Stack spacing={1}>
                {links.map((link, idx) => {
                  const platform = getPlatformInfo(link.url, link.title);
                  return (
                    <Paper
                      key={idx}
                      variant="outlined"
                      sx={{
                        p: 1.25,
                        borderRadius: 2,
                        bgcolor:
                          theme.palette.mode === "light"
                            ? "#F8FAFF"
                            : theme.palette.background.paper,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.2s ease-in-out",
                        "&:hover": {
                          borderColor: theme.palette.primary.main,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                        },
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                        sx={{ minWidth: 0, flexGrow: 1 }}
                      >
                        <Box
                          sx={{
                            p: 0.75,
                            borderRadius: 1.5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor:
                              theme.palette.mode === "light"
                                ? "#fff"
                                : "rgba(255,255,255,0.08)",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                          }}
                        >
                          {renderPlatformIcon(platform.icon, 20)}
                        </Box>
                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                          <Typography variant="subtitle2" noWrap fontWeight={600}>
                            {link.title || platform.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ display: "block" }}
                          >
                            {link.url}
                          </Typography>
                        </Box>
                      </Stack>

                      {/* Action buttons */}
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Tooltip title="Open link in new tab">
                          <IconButton
                            size="small"
                            component="a"
                            href={
                              link.url?.startsWith("http")
                                ? link.url
                                : `https://${link.url}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ArrowSquareOut size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete link">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteLink(idx)}
                          >
                            <Trash size={18} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Stack>

          {/* ======================================================== */}
          {/* SAVE BUTTON */}
          {/* ======================================================== */}
          <Stack direction="row" justifyContent="flex-end" pt={1}>
            <LoadingButton
              fullWidth
              color="primary"
              size="large"
              type="submit"
              variant="contained"
              loading={saving || isSubmitting}
              sx={{ borderRadius: 2, py: 1.25 }}
            >
              Save Profile
            </LoadingButton>
          </Stack>
        </Stack>
      </FormProvider>

      {/* ============================================================ */}
      {/* PRESET AVATARS DIALOG */}
      {/* ============================================================ */}
      <Dialog
        open={openPresetDialog}
        onClose={() => setOpenPresetDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            Choose Avatar Preset
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Select an avatar to use as your profile photo
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            {PRESET_AVATARS.map((item) => {
              const isSelected = avatar === item.url;
              return (
                <Grid item xs={3} key={item.name} sx={{ textAlign: "center" }}>
                  <Box
                    onClick={() => handleSelectPreset(item.url)}
                    sx={{
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      p: 0.5,
                      borderRadius: 2,
                      border: "2px solid",
                      borderColor: isSelected
                        ? theme.palette.primary.main
                        : "transparent",
                      bgcolor: isSelected
                        ? theme.palette.primary.lighter || "rgba(0, 168, 132, 0.1)"
                        : "transparent",
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        transform: "scale(1.08)",
                        borderColor: theme.palette.primary.main,
                      },
                    }}
                  >
                    <Box sx={{ position: "relative" }}>
                      <Avatar
                        src={item.url}
                        alt={item.name}
                        sx={{ width: 54, height: 54 }}
                      />
                      {isSelected && (
                        <Box
                          sx={{
                            position: "absolute",
                            bottom: -2,
                            right: -2,
                            bgcolor: theme.palette.primary.main,
                            color: "#fff",
                            borderRadius: "50%",
                            width: 18,
                            height: 18,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Check size={12} weight="bold" />
                        </Box>
                      )}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{ mt: 0.5, fontWeight: isSelected ? 600 : 400 }}
                      noWrap
                    >
                      {item.name}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPresetDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* ============================================================ */}
      {/* ADD LINK DIALOG */}
      {/* ============================================================ */}
      <Dialog
        open={openLinkDialog}
        onClose={() => setOpenLinkDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            Add Profile Link
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Add social profiles, website, or portfolio links
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2.5 }}>
          <Stack spacing={2.5}>
            {/* Quick platform presets */}
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Quick Platform Presets:
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {PLATFORM_PRESETS.map((preset) => (
                  <Chip
                    key={preset.platform}
                    icon={renderPlatformIcon(preset.platform, 16)}
                    label={preset.name}
                    size="small"
                    variant={linkTitle === preset.name ? "filled" : "outlined"}
                    color={linkTitle === preset.name ? "primary" : "default"}
                    onClick={() => handleSelectPlatformPreset(preset)}
                    sx={{ cursor: "pointer", borderRadius: 1.5 }}
                  />
                ))}
              </Stack>
            </Stack>

            {/* Inputs */}
            <TextField
              label="Link Title"
              placeholder="e.g. Instagram, Portfolio, GitHub"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              fullWidth
              size="small"
            />

            <TextField
              label="URL"
              placeholder="e.g. https://instagram.com/yourusername"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              fullWidth
              size="small"
              helperText="Full link or domain (https:// will be auto-added if omitted)"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenLinkDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddLink}
            disabled={!linkUrl.trim()}
          >
            Add Link
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ProfileForm;