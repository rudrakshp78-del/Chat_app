import { Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import React from "react";
import RegisterForm from "../../sections/auth/RegisterForm";
import AuthSocial from "../../sections/auth/AuthSocial";

const RegisterPage = () => {
  return (
    <>
      <Stack spacing={2} sx={{ mb: 5, position: "relative" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "12px",
          }}
        >
          <img
            src="/Trackon Opposing Finger Gun Logo.png"
            alt="Trackon Logo"
            style={{
              width: "100px",
              height: "100px",
              objectFit: "contain",
              borderRadius: "24px",
            }}
          />
        </div>
        <Typography variant="h4">Get Started With Trackon</Typography>
        <Stack direction="row" spacing={0.5}>
          <Typography variant="body2">Already have an account?</Typography>
          <Link component={RouterLink} to="/auth/login" variant="subtitle2">
            Sign in
          </Link>
        </Stack>
        {/* {Register form} */}

        <RegisterForm />

        <Typography
          component={"div"}
          sx={{
            color: "text.secondary",
            mt: 3,
            typography: "caption",
            textAlign: "center",
          }}
        >
          {"By signing up, I agree to "}
          <Link underline="always" color="text.primary" sx={{ cursor: "pointer" }}>
            Terms of service
          </Link>
          {" and "}
          <Link underline="always" color="text.primary" sx={{ cursor: "pointer" }}>
            Privacy Policy
          </Link>
          .
        </Typography>
        <AuthSocial />
      </Stack>
    </>
  );
};

export default RegisterPage;
