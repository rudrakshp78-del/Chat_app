import React, { useState } from "react";
import {
  Avatar,
  Box,
  Divider,
  IconButton,
  Stack,
  Menu,
  MenuItem,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Logo from "../../assets/Images/logo.ico";
import { Gear } from "phosphor-react";
import { Nav_Buttons, Profile_Menu } from "../../data";
import useSettings from "../../hooks/useSettings";
import AntSwitch from "../../components/AntSwitch";
import { faker } from "@faker-js/faker";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { LogoutUser } from "../../redux/slices/auth";

const SideBar = () => {
  const dispatch = useDispatch();

  const avatarUrl = "https://example.com/avatar.jpg";

  const [selected, setSelected] = useState(0);

  const { onToggleMode } = useSettings();

  const [anchorEl, setAnchorEl] = React.useState(null);

  const open = Boolean(anchorEl);

  const getPath = (index) => {
    switch (index) {
      case 0:
        return "/app";

      case 1:
        return "/Group";

      case 2:
        return "/call";

      case 3:
        return "/Settings";

      default:
        break;
    }
  };

  const getMenuPath = (index) => {
    switch (index) {
      case 0:
        return "/profile";

      case 1:
        return "/Settings";

      case 2:
        // TODO => update token & set isAuth = false
        return "/auth/login";

      default:
        break;
    }
  };

  const navigate = useNavigate();

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const theme = useTheme();
  return (
    <Box
      sx={{
        display: "flex",
        width: 100,
        minWidth: 100,
        height: "100vh",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* LEFT SIDEBAR */}
      <Box
        p={2}
        sx={{
          backgroundColor: theme.palette.background.paper,
          boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
          height: "100vh",
          width: 100,
          flexShrink: 0,
          boxSizing: "border-box",
        }}
      >
        <Stack
          direction="column"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            height: "100%",
          }}
          spacing={3}
        >
          {/* TOP */}
          <Stack alignItems="center" spacing={4}>
            {/* LOGO */}
            <Box
              sx={{
                backgroundColor: theme.palette.primary.main,
                height: 64,
                width: 64,
                borderRadius: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <img
                src={Logo}
                alt="chat app logo"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </Box>

            {/* NAVIGATION */}
            <Stack
              sx={{
                width: "max-content",
              }}
              direction="column"
              alignItems="center"
              spacing={3}
            >
              {Nav_Buttons.map((el) => {
                const isSelected = selected === el.index;

                return isSelected ? (
                  <Box
                    key={el.index}
                    p={1}
                    sx={{
                      backgroundColor: theme.palette.primary.main,
                      borderRadius: 1.5,
                    }}
                  >
                    <IconButton
                      onClick={() => setSelected(el.index)}
                      sx={{
                        width: "max-content",
                        color:
                          theme.palette.mode === "light"
                            ? "#000"
                            : theme.palette.text.primary,
                      }}
                    >
                      {el.icon}
                    </IconButton>
                  </Box>
                ) : (
                  <IconButton
                    key={el.index}
                    onClick={() => {
                      setSelected(el.index);
                      navigate(getPath(el.index));
                    }}
                    sx={{
                      width: "max-content",
                      color:
                        theme.palette.mode === "light"
                          ? "#000"
                          : theme.palette.text.primary,
                    }}
                  >
                    {el.icon}
                  </IconButton>
                );
              })}

              {/* DIVIDER */}
              <Divider
                sx={{
                  width: "48px",
                }}
              />

              {/* SETTINGS */}
              {selected === 3 ? (
                <Box
                  p={1}
                  sx={{
                    backgroundColor: theme.palette.primary.main,
                    borderRadius: 1.5,
                  }}
                >
                  <IconButton
                    onClick={() => {
                      setSelected(3);
                      navigate(getPath(3));
                    }}
                    sx={{
                      color: "#fff",
                    }}
                  >
                    <Gear size={24} />
                  </IconButton>
                </Box>
              ) : (
                <IconButton
                  onClick={() => {
                    setSelected(3);
                    navigate(getPath(3));
                  }}

                  sx={{
                    color: theme.palette.text.primary,
                  }}
                >
                  <Gear size={24} />
                </IconButton>
              )}
            </Stack>
          </Stack>

          {/* BOTTOM */}
          <Stack spacing={4} alignItems="center">
            {/* DARK/LIGHT MODE */}
            <AntSwitch onChange={onToggleMode} defaultChecked />

            {/* AVATAR */}
            <Avatar
              id="basic-button"
              aria-controls={open ? "basic-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={open ? "true" : undefined}
              onClick={handleClick}
              src={faker.image.avatar()}
              alt="User avatar"
              sx={{
                width: 40,
                height: 40,
              }}
            />
            <Menu
              id="basic-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
              MenuListProps={{
                "aria-labelledby": "basic-button",
              }}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "bottom",
                horizontal: "left",
              }}
            >
              <Stack spacing={1} px={1}>
                {Profile_Menu.map((el, idx) => (
                  <MenuItem
                    key={el.title}
                    onClick={() => {
                      handleClose();

                      if (idx === 2) {
                        dispatch(LogoutUser());
                      } else {
                        navigate(getMenuPath(idx));
                      }
                    }}
                  >
                    <Stack
                      onClick={() => {
                        if (idx === 2) {
                          dispatch(LogoutUser());
                        } else {
                          navigate(getMenuPath(idx));
                        }
                      }}
                      sx={{ width: 100 }}
                      direction="row"
                      alignItems={"center"}
                      justifyContent="space-between"
                    >
                      <span>{el.title}</span>
                      {el.icon}
                    </Stack>
                  </MenuItem>
                ))}
              </Stack>
            </Menu>
          </Stack>
        </Stack>
      </Box>

      {/* MAIN CONTENT */}
      {/* MAIN CONTENT */}
      <Box
        sx={{
          flex: 1,
          height: "100vh",
          minWidth: 0,
          overflow: "hidden",
        }}
      ></Box>
    </Box>
  );
};

export default SideBar;
