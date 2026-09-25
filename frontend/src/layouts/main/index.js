import React from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { Container } from "@mui/material";

const MainLayout = () => {
  const { isLoggedIn } = useSelector((state) => state.auth);

  // If already logged in, don't allow auth pages
  if (isLoggedIn) {
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