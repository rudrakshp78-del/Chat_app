import { useState } from "react";
import * as Yup from "yup";
// form
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
// @mui
import { Alert, Link, Stack } from "@mui/material";
import { LoadingButton } from "@mui/lab";
// components
import FormProvider, { RHFTextField } from "../../components/hook-form";
import { useDispatch, useSelector } from "react-redux";
import { ForgotPassword } from "../../redux/slices/auth";

// ----------------------------------------------------------------------

export default function AuthResetPasswordForm() {
  const { isLoading } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [sentEmailAddress, setSentEmailAddress] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const ResetPasswordSchema = Yup.object().shape({
    email: Yup.string()
      .trim()
      .required("Email is required")
      .email("Email must be a valid email address"),
  });

  const methods = useForm({
    mode: "onChange",
    resolver: yupResolver(ResetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const {
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = methods;

  const onSubmit = async (data) => {
    try {
      clearErrors("afterSubmit");
      setIsSubmittedSuccess(false);
      setDevResetUrl("");
      setPreviewUrl("");

      const cleanEmail = (data.email || "").trim().toLowerCase();
      const result = await dispatch(ForgotPassword({ email: cleanEmail }));
      if (result?.success) {
        setIsSubmittedSuccess(true);
        setSentEmailAddress(cleanEmail);
        if (result.data?.dev_reset_url) {
          setDevResetUrl(result.data.dev_reset_url);
        }
        if (result.data?.previewUrl) {
          setPreviewUrl(result.data.previewUrl);
        }
      } else if (result?.error) {
        setError("afterSubmit", {
          type: "manual",
          message: result.error,
        });
      }
    } catch (error) {
      console.error("Forgot password form submit error:", error);
      setError("afterSubmit", {
        type: "manual",
        message: error?.message || "Failed to send reset link. Please try again.",
      });
    }
  };

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={3}>
        {isSubmittedSuccess && (
          <Alert severity="success">
            A password reset link has been sent to{" "}
            <strong>{sentEmailAddress}</strong>. Please check your inbox and
            spam folder.
            {previewUrl && (
              <>
                <br />
                <Link href={previewUrl} target="_blank" rel="noopener noreferrer">
                  Open Email Preview (Dev)
                </Link>
              </>
            )}
            {devResetUrl && (
              <>
                <br />
                <Link href={devResetUrl}>Open Reset Password Link (Dev)</Link>
              </>
            )}
          </Alert>
        )}

        {errors.afterSubmit && (
          <Alert severity="error">{errors.afterSubmit.message}</Alert>
        )}

        <RHFTextField
          name="email"
          label="Email address"
          placeholder="Enter your email address"
          InputLabelProps={{ shrink: true }}
          type="email"
          autoComplete="email"
        />

        <LoadingButton
          loading={isLoading}
          fullWidth
          size="large"
          type="submit"
          variant="contained"
          sx={{
            mt: 3,
            bgcolor: "text.primary",
            color: (theme) =>
              theme.palette.mode === "light" ? "common.white" : "grey.800",
            "&:hover": {
              bgcolor: "text.primary",
              color: (theme) =>
                theme.palette.mode === "light" ? "common.white" : "grey.800",
            },
          }}
        >
          {isSubmittedSuccess ? "Resend Reset Link" : "Send Reset Link"}
        </LoadingButton>
      </Stack>
    </FormProvider>
  );
}
