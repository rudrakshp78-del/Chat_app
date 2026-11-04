import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Stack,
  Box,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import { SignOut } from "phosphor-react";
import { useDispatch } from "react-redux";
import { LogoutUser } from "../redux/slices/auth";

const LogoutDialog = ({ open, handleClose }) => {
  const dispatch = useDispatch();
  const theme = useTheme();

  const handleConfirmLogout = async () => {
    try {
      handleClose();
      await dispatch(LogoutUser());
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      window.location.href = "/auth/login";
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      keepMounted={false}
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1.5,
          maxWidth: 380,
          width: "90%",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.25)",
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              bgcolor: (theme) => alpha(theme.palette.error.main, 0.12),
              color: "error.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SignOut size={24} weight="bold" />
          </Box>
          <Typography variant="h6" fontWeight={700}>
            Log Out
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ py: 1 }}>
        <DialogContentText
          sx={{
            color: "text.secondary",
            fontSize: "0.95rem",
          }}
        >
          Are you sure you want to log out of Trackon? You will need to log back in to access your chats and messages.
        </DialogContentText>
      </DialogContent>

      <DialogActions sx={{ px: 2, pt: 2, pb: 1 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            px: 2.5,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirmLogout}
          variant="contained"
          color="error"
          startIcon={<SignOut size={18} weight="bold" />}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 700,
            px: 2.5,
            boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.35)}`,
          }}
        >
          Log Out
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LogoutDialog;
