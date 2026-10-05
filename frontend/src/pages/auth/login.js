import React from "react";
import { Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import AuthSocial from "../../sections/auth/AuthSocial";
import LoginForm from "../../sections/auth/LoginForm";

const LoginPage = () => {
  return (
    <Stack
      spacing={2}
      sx={{
        width: "100%",
        maxWidth: 450,
        mx: "auto",
        mt: { xs: 2, md: 4 },
        px: { xs: 1, sm: 3 },
        mb: { xs: 2, md: 4 },
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "20px",
        }}
      >
        <img
          src="/Trackon Opposing Finger Gun Logo.png"
          alt="Trackon Logo"
          style={{
            width: "120px",
            height: "120px",
            objectFit: "contain",
            borderRadius: "30px",
          }}
        />
      </div>
      <Typography variant="h4">Login to Trackon</Typography>

      <Stack direction="row" spacing={0.5}>
        <Typography variant="body2">New User?</Typography>

        <Link to="/auth/register" component={RouterLink} variant="subtitle2">
          Create an account
        </Link>
      </Stack>

      <LoginForm />

      <AuthSocial />
    </Stack>
  );
};

export default LoginPage;