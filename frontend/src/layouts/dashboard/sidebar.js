import React from "react";
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
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LogoutUser } from "../../redux/slices/auth";
import getAvatarUrl, { DEFAULT_USER_AVATAR } from "../../utils/getAvatarUrl";

const SideBar = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.app);
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveIndex = () => {
    const current = location.pathname.toLowerCase();
    if (current.startsWith("/status")) return 1;
    if (current.startsWith("/group")) return 2;
    if (current.startsWith("/call")) return 3;
    if (current.startsWith("/settings")) return 4;
    return 0;
  };

  const selected = getActiveIndex();

  const { onToggleMode } = useSettings();

  const [anchorEl, setAnchorEl] = React.useState(null);

  const open = Boolean(anchorEl);

  const getPath = (index) => {
    switch (index) {
      case 0:
        return "/app";

      case 1:
        return "/status";

      case 2:
        return "/Group";

      case 3:
        return "/call";

      case 4:
        return "/Settings";

      default:
        return "/app";
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
              onClick={() => navigate("/app")}
              sx={{
                backgroundColor: theme.palette.primary.main,
                height: 64,
                width: 64,
                borderRadius: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <img
                src="/Trackon Opposing Finger Gun Logo.png"
                onError={(e) => {
                  e.currentTarget.src = Logo;
                }}
                alt="Trackon logo"
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
                      onClick={() => navigate(getPath(el.index))}
                      sx={{
                        width: "max-content",
                        color: "#ffffff",
                      }}
                    >
                      {el.icon}
                    </IconButton>
                  </Box>
                ) : (
                  <IconButton
                    key={el.index}
                    onClick={() => navigate(getPath(el.index))}
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
              {selected === 4 ? (
                <Box
                  p={1}
                  sx={{
                    backgroundColor: theme.palette.primary.main,
                    borderRadius: 1.5,
                  }}
                >
                  <IconButton
                    onClick={() => navigate(getPath(4))}
                    sx={{
                      color: "#fff",
                    }}
                  >
                    <Gear size={24} />
                  </IconButton>
                </Box>
              ) : (
                <IconButton
                  onClick={() => navigate(getPath(4))}
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
            <AntSwitch
              checked={theme.palette.mode === "dark"}
              onChange={onToggleMode}
            />

            {/* AVATAR */}
            <Avatar
              id="basic-button"
              aria-controls={open ? "basic-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={open ? "true" : undefined}
              onClick={handleClick}
              src={getAvatarUrl(user?.avatar, user?.firstName)}
              alt="User avatar"
              imgProps={{
                onError: (e) => {
                  e.currentTarget.src = DEFAULT_USER_AVATAR;
                },
              }}
              sx={{
                width: 40,
                height: 40,
                cursor: "pointer",
              }}
            >
              {(user?.firstName || "U")[0]}
            </Avatar>
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
    </Box>
  );
};

export default SideBar;
