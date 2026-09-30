import React from "react";
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
  Paper,
  Tooltip,
  useTheme,
} from "@mui/material";
import { Sun, Moon, Palette, X, Check } from "phosphor-react";
import useSettings from "../../../hooks/useSettings";
import { useDispatch } from "react-redux";
import { showSnackbar } from "../../../redux/slices/app";

const COLOR_PRESETS = [
  { name: "default", label: "Emerald (WhatsApp)", color: "#00A884" },
  { name: "purple", label: "Purple", color: "#7635dc" },
  { name: "cyan", label: "Cyan", color: "#1CCAFF" },
  { name: "blue", label: "Blue", color: "#2065D1" },
  { name: "orange", label: "Orange", color: "#fda92d" },
  { name: "red", label: "Red", color: "#FF3030" },
];

const ThemeDialog = ({ open, handleClose }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const {
    themeMode,
    onChangeMode,
    themeColorPresets,
    onChangeColor,
    themeContrast,
    onChangeContrast,
  } = useSettings();

  const handleApply = () => {
    dispatch(
      showSnackbar({
        severity: "success",
        message: "Theme preferences applied successfully!",
      })
    );
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
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
            <Palette size={22} weight="bold" />
          </Box>
          <Stack spacing={0}>
            <Typography variant="h6" fontWeight={700}>
              Theme & Appearance
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Customize chat mode and accent color
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
          {/* Mode Selection */}
          <Box>
            <Typography
              variant="overline"
              color="primary.main"
              fontWeight={700}
              letterSpacing={1.2}
            >
              Color Mode
            </Typography>

            <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
              {/* Light Mode Card */}
              <Paper
                variant="outlined"
                onClick={() => onChangeMode({ target: { value: "light" } })}
                sx={{
                  flex: 1,
                  p: 2,
                  borderRadius: 2,
                  cursor: "pointer",
                  textAlign: "center",
                  border: "2px solid",
                  borderColor:
                    themeMode === "light"
                      ? theme.palette.primary.main
                      : theme.palette.divider,
                  bgcolor:
                    themeMode === "light"
                      ? "rgba(0, 168, 132, 0.08)"
                      : "transparent",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: theme.palette.primary.main,
                  },
                }}
              >
                <Sun size={28} color="#f59e0b" weight="fill" />
                <Typography variant="subtitle2" fontWeight={600} mt={0.5}>
                  Light
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Classic Bright
                </Typography>
              </Paper>

              {/* Dark Mode Card */}
              <Paper
                variant="outlined"
                onClick={() => onChangeMode({ target: { value: "dark" } })}
                sx={{
                  flex: 1,
                  p: 2,
                  borderRadius: 2,
                  cursor: "pointer",
                  textAlign: "center",
                  border: "2px solid",
                  borderColor:
                    themeMode === "dark"
                      ? theme.palette.primary.main
                      : theme.palette.divider,
                  bgcolor:
                    themeMode === "dark"
                      ? "rgba(0, 168, 132, 0.15)"
                      : "transparent",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: theme.palette.primary.main,
                  },
                }}
              >
                <Moon size={28} color="#818cf8" weight="fill" />
                <Typography variant="subtitle2" fontWeight={600} mt={0.5}>
                  Dark
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Night Friendly
                </Typography>
              </Paper>
            </Stack>
          </Box>

          <Divider />

          {/* Accent Color Presets */}
          <Box>
            <Typography
              variant="overline"
              color="primary.main"
              fontWeight={700}
              letterSpacing={1.2}
            >
              Primary Accent Color
            </Typography>

            <Stack
              direction="row"
              spacing={1.5}
              sx={{ mt: 1.5, justifyContent: "space-between" }}
            >
              {COLOR_PRESETS.map((preset) => {
                const isSelected = themeColorPresets === preset.name;
                return (
                  <Tooltip key={preset.name} title={preset.label}>
                    <Box
                      onClick={() =>
                        onChangeColor({ target: { value: preset.name } })
                      }
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: "50%",
                        bgcolor: preset.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        border: "3px solid",
                        borderColor: isSelected
                          ? theme.palette.mode === "light"
                            ? "#1e293b"
                            : "#fff"
                          : "transparent",
                        boxShadow: isSelected
                          ? "0 0 0 2px " + preset.color
                          : "0 2px 5px rgba(0,0,0,0.15)",
                        transition: "all 0.2s ease-in-out",
                        "&:hover": {
                          transform: "scale(1.12)",
                        },
                      }}
                    >
                      {isSelected && <Check size={20} color="#fff" weight="bold" />}
                    </Box>
                  </Tooltip>
                );
              })}
            </Stack>
          </Box>

          <Divider />

          {/* High Contrast Toggle */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack spacing={0.25}>
              <Typography variant="subtitle2">High Contrast Mode</Typography>
              <Typography variant="caption" color="text.secondary">
                Enhance contrast borders and dark accents
              </Typography>
            </Stack>
            <Switch
              checked={themeContrast === "bold"}
              onChange={() =>
                onChangeContrast({
                  target: {
                    value: themeContrast === "default" ? "bold" : "default",
                  },
                })
              }
            />
          </Stack>

          {/* Live Mini Preview Bubble */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor:
                themeMode === "light"
                  ? "#F0F2F5"
                  : theme.palette.background.neutral || "#111B21",
              border: "1px dashed",
              borderColor: theme.palette.divider,
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600} mb={1} display="block">
              Live Chat Preview:
            </Typography>
            <Box
              sx={{
                bgcolor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText || "#fff",
                p: 1.25,
                borderRadius: "10px 10px 0px 10px",
                maxWidth: "85%",
                ml: "auto",
                fontSize: "0.85rem",
                boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              }}
            >
              This is how your sent chat bubbles look with your theme! ✨
            </Box>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={handleApply}>
          Apply Theme
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ThemeDialog;