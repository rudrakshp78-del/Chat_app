import React, { useState } from "react";
import {
  Avatar,
  Box,
  Fade,
  Menu,
  MenuItem,
  Stack,
  Typography,
  Divider,
} from "@mui/material";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { User, Gear, SignOut, Moon, Sun } from "phosphor-react";
import getAvatarUrl from "../../utils/getAvatarUrl";
import useSettings from "../../hooks/useSettings";
import LogoutDialog from "../../components/LogoutDialog";

const ProfileMenu = () => {
  const { user } = useSelector((state) => state.app);
  const { onToggleMode, themeMode } = useSettings();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const [openLogout, setOpenLogout] = useState(false);
  const openMenu = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const fullName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : "My Account";
  const userImg = getAvatarUrl(user?.avatar, fullName);

  return (
    <>
      <Avatar
        id="profile-positioned-button"
        aria-controls={openMenu ? "profile-positioned-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={openMenu ? "true" : undefined}
        alt={fullName}
        src={userImg}
        onClick={handleClick}
        sx={{
          width: 38,
          height: 38,
          cursor: "pointer",
          border: (theme) => `2px solid ${theme.palette.primary.main}`,
          transition: "transform 0.15s ease",
          "&:hover": {
            transform: "scale(1.06)",
          },
        }}
      >
        {(fullName || "U").charAt(0).toUpperCase()}
      </Avatar>

      <Menu
        MenuListProps={{
          "aria-labelledby": "profile-positioned-button",
        }}
        TransitionComponent={Fade}
        id="profile-positioned-menu"
        anchorEl={anchorEl}
        open={openMenu}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            minWidth: 200,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
            mt: 1,
          },
        }}
      >
        <Box px={2} py={1.5}>
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            {fullName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {user?.email || user?.about || "Trackon User"}
          </Typography>
        </Box>

        <Divider />

        <Box p={0.5}>
          <MenuItem
            onClick={() => {
              handleClose();
              navigate("/profile");
            }}
            sx={{ borderRadius: 1.5, py: 1 }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5} width="100%">
              <User size={18} />
              <Typography variant="body2" fontWeight={500}>
                Profile
              </Typography>
            </Stack>
          </MenuItem>

          <MenuItem
            onClick={() => {
              handleClose();
              navigate("/settings");
            }}
            sx={{ borderRadius: 1.5, py: 1 }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5} width="100%">
              <Gear size={18} />
              <Typography variant="body2" fontWeight={500}>
                Settings
              </Typography>
            </Stack>
          </MenuItem>

          <MenuItem
            onClick={() => {
              onToggleMode();
              handleClose();
            }}
            sx={{ borderRadius: 1.5, py: 1 }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5} width="100%">
              {themeMode === "light" ? <Moon size={18} /> : <Sun size={18} />}
              <Typography variant="body2" fontWeight={500}>
                {themeMode === "light" ? "Dark Mode" : "Light Mode"}
              </Typography>
            </Stack>
          </MenuItem>

          <Divider sx={{ my: 0.5 }} />

          <MenuItem
            onClick={() => {
              handleClose();
              setOpenLogout(true);
            }}
            sx={{
              borderRadius: 1.5,
              py: 1,
              color: "error.main",
              "&:hover": {
                bgcolor: (theme) => `${theme.palette.error.main}14`,
              },
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5} width="100%">
              <SignOut size={18} weight="bold" />
              <Typography variant="body2" fontWeight={700}>
                Log Out
              </Typography>
            </Stack>
          </MenuItem>
        </Box>
      </Menu>

      <LogoutDialog
        open={openLogout}
        handleClose={() => setOpenLogout(false)}
      />
    </>
  );
};

export default ProfileMenu;
