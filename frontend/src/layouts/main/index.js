import React from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

const MainLayout = () => {
  const { isLoggedIn } = useSelector((state) => state.auth);

  // If already logged in, don't allow auth pages
  if (isLoggedIn) {
    return <Navigate to="/app" replace />;
  }

  return (
    <>
      <Outlet />
    </>
  );
};

export default MainLayout;