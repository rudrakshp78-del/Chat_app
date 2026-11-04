import React, { useState, useEffect } from "react";
import { useTheme, alpha } from "@mui/material/styles";
import {
  Avatar,
  Backdrop,
  Box,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChatCircleDots,
  GearSix,
  Phone,
  Users,
  User,
  X,
  SignOut,
} from "phosphor-react";
import LogoutDialog from "../../components/LogoutDialog";
import { useDispatch, useSelector } from "react-redux";
import { CloseSidebar, SelectConversation } from "../../redux/slices/app";
import getAvatarUrl from "../../utils/getAvatarUrl";

// Standard navigation items displayed on the bottom bar
const LEFT_NAV_ITEMS = [
  { index: 0, path: "/app", icon: <ChatCircleDots size={22} weight="fill" />, title: "Chats" },
  { index: 1, path: "/group", icon: <Users size={22} weight="fill" />, title: "Groups" },
];

const RIGHT_NAV_ITEMS = [
  { index: 2, path: "/call", icon: <Phone size={22} weight="fill" />, title: "Calls" },
  { index: 3, path: "/Settings", icon: <GearSix size={22} weight="fill" />, title: "Settings" },
];

// Options that fan out in a 90° arc (from 135° to 45°) when Center Profile is clicked
const ARC_OPTIONS = [
  {
    index: 0,
    title: "Profile",
    path: "/Profile",
    icon: <User size={22} weight="bold" />,
    color: "#E91E63",
  },
  {
    index: 1,
    title: "Groups",
    path: "/group",
    icon: <Users size={22} weight="bold" />,
    color: "#7F66FF",
  },
  {
    index: 2,
    title: "Calls",
    path: "/call",
    icon: <Phone size={22} weight="bold" />,
    color: "#0288D1",
  },
  {
    index: 3,
    title: "Settings",
    path: "/Settings",
    icon: <GearSix size={22} weight="bold" />,
    color: "#FF9800",
  },
  {
    index: 4,
    title: "Log Out",
    action: "logout",
    icon: <SignOut size={22} weight="bold" />,
    color: "#EF4444",
  },
];

const BottomNav = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [openLogout, setOpenLogout] = useState(false);

  const { user, sideBar } = useSelector((state) => state.app);
  const currentPath = location.pathname.toLowerCase();

  // Close arc menu if route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleNavClick = (target) => {
    setIsOpen(false);
    if (target?.action === "logout") {
      setOpenLogout(true);
      return;
    }
    const path = typeof target === "string" ? target : target?.path;
    if (!path) return;
    if (sideBar?.open) {
      dispatch(CloseSidebar());
    }
    if (path.toLowerCase() === "/app") {
      dispatch(SelectConversation({ room_id: null }));
    }
    navigate(path);
  };

  const toggleArcMenu = (e) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch {
        // ignore
      }
    }
    setIsOpen((prev) => !prev);
  };

  // Arc math: 5 items spread across a 90° span from 135° to 45°
  const radius = 115;
  const startAngle = 135;
  const endAngle = 45;
  const angleStep = (startAngle - endAngle) / (ARC_OPTIONS.length - 1);

  const renderNavButton = (el) => {
    const isSelected =
      currentPath === el.path.toLowerCase() ||
      (el.path === "/app" && currentPath === "/");

    const brandColor = "#00A884"; // WhatsApp signature emerald green

    return (
      <Stack
        key={el.path}
        alignItems="center"
        justifyContent="center"
        spacing={0.2}
        onClick={() => handleNavClick(el)}
        sx={{
          cursor: "pointer",
          minWidth: 52,
          py: 0.1,
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {/* WhatsApp-style active oval pill indicator around icon */}
        <Box
          sx={{
            backgroundColor: isSelected
              ? theme.palette.mode === "light"
                ? alpha(brandColor, 0.14)
                : alpha(brandColor, 0.25)
              : "transparent",
            borderRadius: "16px",
            px: 2,
            py: 0.3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.18s ease-in-out",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isSelected
                ? brandColor
                : theme.palette.mode === "light"
                ? "#54656F"
                : "#8696A0",
              "& svg": {
                width: 22,
                height: 22,
              },
            }}
          >
            {el.icon}
          </Box>
        </Box>

        <Typography
          variant="caption"
          sx={{
            fontSize: "0.68rem",
            fontWeight: isSelected ? 700 : 500,
            lineHeight: 1.1,
            color: isSelected
              ? brandColor
              : theme.palette.mode === "light"
              ? "#54656F"
              : "#8696A0",
          }}
        >
          {el.title}
        </Typography>
      </Stack>
    );
  };

  return (
    <>
      {/* Blurred Backdrop when Arc Menu is Open */}
      <Backdrop
        open={isOpen}
        onClick={() => setIsOpen(false)}
        sx={{
          zIndex: 1150,
          backgroundColor: "rgba(0, 0, 0, 0.45)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      {/* WhatsApp-Style Sleek Bottom Navigation Bar */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1200,
          width: "100%",
          flexShrink: 0,
          backgroundColor:
            theme.palette.mode === "light"
              ? "#FFFFFF"
              : theme.palette.background.paper,
          borderTop: `1px solid ${
            theme.palette.mode === "light"
              ? "rgba(0, 0, 0, 0.08)"
              : "rgba(255, 255, 255, 0.08)"
          }`,
          boxShadow: "0px -1px 3px rgba(0, 0, 0, 0.04)",
          pt: 0.5,
          pb: "calc(var(--safe-bottom, 0px) + 4px)",
          px: 0.5,
        }}
      >
        <Stack
          sx={{ width: "100%", position: "relative" }}
          direction="row"
          alignItems="center"
          justifyContent="space-around"
        >
          {/* LEFT ITEMS: Chats, Groups */}
          {LEFT_NAV_ITEMS.map(renderNavButton)}

          {/* CENTER: Profile Button & 0 to 90 Arc Speed Dial */}
          <Box
            sx={{
              position: "relative",
              minWidth: 52,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* ARC SPEED-DIAL OPTIONS (0 to 90 degree fan) */}
            {ARC_OPTIONS.map((el, i) => {
              const angleDeg = startAngle - i * angleStep;
              const angleRad = (angleDeg * Math.PI) / 180;
              const x = Math.round(radius * Math.cos(angleRad));
              const y = Math.round(-radius * Math.sin(angleRad));

              return (
                <Box
                  key={el.title}
                  onClick={() => handleNavClick(el)}
                  sx={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    marginLeft: "-24px",
                    marginTop: "-24px",
                    width: 48,
                    height: 48,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1250,
                    cursor: "pointer",
                    pointerEvents: isOpen ? "auto" : "none",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen
                      ? `translate(${x}px, ${y}px) scale(1)`
                      : "translate(0, 0) scale(0.2)",
                    transition: `transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${
                      i * 0.03
                    }s, opacity 0.2s ease`,
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      backgroundColor: el.color,
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: `0 4px 14px ${alpha(el.color, 0.45)}`,
                      transition: "transform 0.15s ease",
                      "&:active": {
                        transform: "scale(0.92)",
                      },
                    }}
                  >
                    {el.icon}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 0.5,
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      color:
                        theme.palette.mode === "light"
                          ? "#1E293B"
                          : "#F8FAFC",
                      backgroundColor:
                        theme.palette.mode === "light"
                          ? "rgba(255, 255, 255, 0.95)"
                          : "rgba(15, 23, 42, 0.92)",
                      px: 0.75,
                      py: 0.2,
                      borderRadius: 1,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.22)",
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                    }}
                  >
                    {el.title}
                  </Typography>
                </Box>
              );
            })}

            {/* CENTER PROFILE BUTTON (Rotates 0° to 90° on click) */}
            <Stack
              alignItems="center"
              justifyContent="center"
              spacing={0.2}
              sx={{
                cursor: "pointer",
                userSelect: "none",
                WebkitTapHighlightColor: "transparent",
              }}
              onClick={toggleArcMenu}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  p: "2px",
                  background: isOpen
                    ? `linear-gradient(135deg, ${theme.palette.primary.main}, #FF4757)`
                    : `linear-gradient(135deg, #00A884, #128C7E)`,
                  boxShadow: isOpen
                    ? `0 4px 14px ${alpha("#00A884", 0.5)}`
                    : "0 2px 8px rgba(0, 0, 0, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: isOpen
                    ? "translateY(-2px) rotate(90deg) scale(1.06)"
                    : "translateY(-2px) rotate(0deg) scale(1)",
                  transition:
                    "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease",
                }}
              >
                {isOpen ? (
                  <Box
                    sx={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      backgroundColor: theme.palette.background.paper,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: theme.palette.text.primary,
                    }}
                  >
                    <X size={20} weight="bold" />
                  </Box>
                ) : (
                  <Avatar
                    src={getAvatarUrl(user?.avatar, user?.firstName)}
                    alt={user?.firstName || "Profile"}
                    sx={{ width: "100%", height: "100%" }}
                  />
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.68rem",
                  fontWeight: isOpen ? 700 : 500,
                  lineHeight: 1.1,
                  color: isOpen
                    ? "#00A884"
                    : theme.palette.mode === "light"
                    ? "#54656F"
                    : "#8696A0",
                }}
              >
                Profile
              </Typography>
            </Stack>
          </Box>

          {/* RIGHT ITEMS: Calls, Settings */}
          {RIGHT_NAV_ITEMS.map(renderNavButton)}
        </Stack>
      </Box>

      {/* Logout Confirmation Dialog */}
      <LogoutDialog
        open={openLogout}
        handleClose={() => setOpenLogout(false)}
      />
    </>
  );
};

export default BottomNav;
