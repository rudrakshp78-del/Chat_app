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
        mt: 8,
        px: 3,
        mb: 5,
      }}
    >
      <Typography variant="h4">
        Login to Tawk
      </Typography>

      <Stack direction="row" spacing={0.5}>
        <Typography variant="body2">
          New User?
        </Typography>

        <Link
          to="/auth/register"
          component={RouterLink}
          variant="subtitle2"
        >
          Create an account
        </Link>
      </Stack>

      <LoginForm />

      <AuthSocial />
    </Stack>
  );
};

export default LoginPage;