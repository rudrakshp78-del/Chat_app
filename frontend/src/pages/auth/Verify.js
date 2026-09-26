import { Typography, Stack } from "@mui/material";
import React from "react";
import { useSelector } from "react-redux";
import VerifyForm from "../../sections/auth/VerifyForm";

const Verify = () => {
  const reduxEmail = useSelector((state) => state.auth.email);
  const email =
    reduxEmail ||
    (typeof window !== "undefined"
      ? window.localStorage.getItem("verify_email")
      : "") ||
    "";

  return (
    <>
      <Stack spacing={2} sx={{ mb: 5, position: "relative" }}>
        <Typography variant="h4">Please Verify OTP</Typography>

        <Stack direction={"row"} spacing={0.5}>
          <Typography variant="body2">
            {email
              ? `Sent to email (${email})`
              : "Please enter the OTP sent to your registered email."}
          </Typography>
        </Stack>
      </Stack>
      {/* verify form */}
      <VerifyForm />
    </>
  );
};

export default Verify;