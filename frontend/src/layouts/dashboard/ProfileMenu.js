import React from "react";
import { Avatar, Box, Fade, Menu, MenuItem, Stack, Typography, Divider } from "@mui/material";
import { Profile_Menu } from "../../data";
import { useDispatch, useSelector } from "react-redux";
import { LogoutUser } from "../../redux/slices/auth";
import { socket } from "../../socket";
import { useNavigate } from "react-router-dom";
import getAvatarUrl from "../../utils/getAvatarUrl";
import useSettings from "../../hooks/useSettings";
import { Moon, Sun } from "phosphor-react";

const ProfileMenu = () => {
  const { user } = useSelector((state) => state.app);
  const { onToggleMode, themeMode } = useSettings();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const openMenu = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const user_id = window.localStorage.getItem("user_id");
  const user_name = user?.firstName || "User";
  const user_img = getAvatarUrl(user?.avatar, user_name);

  return (
    <>
      <Avatar
        id="profile-positioned-button"
        aria-controls={openMenu ? "profile-positioned-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={openMenu ? "true" : undefined}
        alt={user_name}
        src={user_img}
        onClick={handleClick}
        sx={{ width: 36, height: 36, cursor: "pointer" }}
      >
        {user_name.charAt(0).toUpperCase()}
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
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Box p={1}>
          <Stack spacing={1}>
            {Profile_Menu.map((el, idx) => (
              <MenuItem
                key={el.title}
                onClick={() => {
                  handleClose();
                  if (idx === 0) {
                    navigate("/profile");
                  } else if (idx === 1) {
                    navigate("/settings");
                  } else {
                    dispatch(LogoutUser());
                    socket.emit("end", { user_id });
                  }
                }}
              >
                <Stack
                  sx={{ width: 120 }}
                  direction="row"
                  alignItems={"center"}
                  justifyContent="space-between"
                >
                  <Typography variant="body2">{el.title}</Typography>
                  {el.icon}
                </Stack>
              </MenuItem>
            ))}
            <Divider />
            <MenuItem
              onClick={() => {
                onToggleMode();
                handleClose();
              }}
            >
              <Stack
                sx={{ width: 120 }}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="body2">
                  {themeMode === "light" ? "Dark Mode" : "Light Mode"}
                </Typography>
                {themeMode === "light" ? <Moon size={20} /> : <Sun size={20} />}
              </Stack>
            </MenuItem>
          </Stack>
        </Box>
      </Menu>
    </>
  );
};

export default ProfileMenu;