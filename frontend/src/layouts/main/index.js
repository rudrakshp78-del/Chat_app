import React from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Container } from "@mui/material";

const MainLayout = () => {
  const { isLoggedIn } = useSelector((state) => state.auth);
  const { pathname } = useLocation();

  // Always allow password reset routes even if another user is currently logged in
  const normalizedPath = (pathname || "").toLowerCase();
  const isPasswordResetRoute =
    normalizedPath.startsWith("/auth/new-password") ||
    normalizedPath.startsWith("/auth/reset-password");

  if (isLoggedIn && !isPasswordResetRoute) {
    return <Navigate to="/app" replace />;
  }

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: { xs: "100dvh", md: "100vh" },
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        py: { xs: 3, md: 5 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Outlet />
    </Container>
  );
};

export default MainLayout;
