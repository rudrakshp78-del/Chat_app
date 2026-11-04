import { useState } from "react";
import * as Yup from "yup";
// form
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
// @mui
import {
  Box,
  Stack,
  Alert,
  IconButton,
  InputAdornment,
  Typography,
  LinearProgress,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
// components
import FormProvider, { RHFTextField } from "../../components/hook-form";
import { Check, Eye, EyeSlash, X } from "phosphor-react";
import { useDispatch, useSelector } from "react-redux";
import { RegisterUser } from "../../redux/slices/auth";
import { showSnackbar } from "../../redux/slices/app";

// ----------------------------------------------------------------------

export default function AuthRegisterForm() {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);

  const RegisterSchema = Yup.object().shape({
    firstName: Yup.string().trim().required("First name is required"),
    lastName: Yup.string().trim().required("Last name is required"),
    email: Yup.string()
      .trim()
      .required("Email is required")
      .email("Email must be a valid email address"),
    password: Yup.string()
      .required("Password is required")
      .min(8, "Password must be at least 8 characters long")
      .matches(/[a-zA-Z]/, "Password must include at least one letter (a-z, A-Z)")
      .matches(/[0-9]/, "Password must include at least one number (0-9)")
      .matches(
        /[^a-zA-Z0-9]/,
        "Password must be strong: include numbers, letters, and special characters (!@#$%...)"
      ),
  });

  const defaultValues = {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  };

  const methods = useForm({
    mode: "onChange",
    resolver: yupResolver(RegisterSchema),
    defaultValues,
  });

  const {
    reset,
    setError,
    handleSubmit,
    watch,
    formState: { errors },
  } = methods;

  const passwordValue = watch("password") || "";

  // Password Strength Criteria
  const hasMinLength = passwordValue.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(passwordValue);
  const hasNumber = /[0-9]/.test(passwordValue);
  const hasSpecial = /[^a-zA-Z0-9]/.test(passwordValue);

  const passedCount = [hasMinLength, hasLetter, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthColor =
    passedCount <= 1 ? "#EF4444" : passedCount <= 3 ? "#F59E0B" : "#10B981";
  const strengthLabel =
    passedCount <= 1 ? "Weak" : passedCount <= 3 ? "Medium" : "Strong";

  const onSubmit = async (data) => {
    try {
      // submit data to backend
      dispatch(RegisterUser(data));
    } catch (error) {
      console.error(error);
      reset();
      setError("afterSubmit", {
        ...error,
        message: error.message,
      });
    }
  };

  const onFormError = (formErrors) => {
    const firstMsg =
      formErrors.firstName?.message ||
      formErrors.lastName?.message ||
      formErrors.email?.message ||
      formErrors.password?.message ||
      "Please fill in all required fields correctly";
    dispatch(showSnackbar({ severity: "warning", message: firstMsg }));
  };

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit, onFormError)}>
      <Stack spacing={2.5} mb={3.5}>
        {!!errors.afterSubmit && (
          <Alert severity="error">{errors.afterSubmit.message}</Alert>
        )}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <RHFTextField name="firstName" label="First name" />
          <RHFTextField name="lastName" label="Last name" />
        </Stack>

        <RHFTextField name="email" label="Email address" />

        <Box>
          <RHFTextField
            name="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <Eye /> : <EyeSlash />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {passwordValue.length > 0 && (
            <Box
              sx={{
                mt: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === "light"
                    ? "rgba(0,0,0,0.03)"
                    : "rgba(255,255,255,0.05)",
                border: "1px solid",
                borderColor: (theme) =>
                  passedCount === 4
                    ? "success.main"
                    : theme.palette.mode === "light"
                    ? "rgba(0,0,0,0.08)"
                    : "rgba(255,255,255,0.12)",
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                mb={0.75}
              >
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  Password Strength:{" "}
                  <span style={{ color: strengthColor }}>{strengthLabel}</span>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {passedCount}/4 requirements met
                </Typography>
              </Stack>

              <LinearProgress
                variant="determinate"
                value={(passedCount / 4) * 100}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  mb: 1.25,
                  bgcolor: (theme) =>
                    theme.palette.mode === "light"
                      ? "rgba(0,0,0,0.06)"
                      : "rgba(255,255,255,0.1)",
                  "& .MuiLinearProgress-bar": {
                    bgcolor: strengthColor,
                    borderRadius: 3,
                  },
                }}
              />

              <Stack spacing={0.5}>
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  {hasMinLength ? (
                    <Check size={14} color="#10B981" weight="bold" />
                  ) : (
                    <X size={14} color="#EF4444" weight="bold" />
                  )}
                  <Typography
                    variant="caption"
                    color={hasMinLength ? "text.primary" : "text.secondary"}
                    sx={{ fontWeight: hasMinLength ? 600 : 400 }}
                  >
                    At least 8 characters
                  </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={0.75}>
                  {hasNumber ? (
                    <Check size={14} color="#10B981" weight="bold" />
                  ) : (
                    <X size={14} color="#EF4444" weight="bold" />
                  )}
                  <Typography
                    variant="caption"
                    color={hasNumber ? "text.primary" : "text.secondary"}
                    sx={{ fontWeight: hasNumber ? 600 : 400 }}
                  >
                    At least one number (0-9)
                  </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={0.75}>
                  {hasLetter ? (
                    <Check size={14} color="#10B981" weight="bold" />
                  ) : (
                    <X size={14} color="#EF4444" weight="bold" />
                  )}
                  <Typography
                    variant="caption"
                    color={hasLetter ? "text.primary" : "text.secondary"}
                    sx={{ fontWeight: hasLetter ? 600 : 400 }}
                  >
                    At least one letter (a-z, A-Z)
                  </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={0.75}>
                  {hasSpecial ? (
                    <Check size={14} color="#10B981" weight="bold" />
                  ) : (
                    <X size={14} color="#EF4444" weight="bold" />
                  )}
                  <Typography
                    variant="caption"
                    color={hasSpecial ? "text.primary" : "text.secondary"}
                    sx={{ fontWeight: hasSpecial ? 600 : 400 }}
                  >
                    At least one special character (!@#$%^&*...)
                  </Typography>
                </Stack>
              </Stack>

              {passedCount < 4 ? (
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    mt: 1,
                    color: "warning.main",
                    fontWeight: 600,
                  }}
                >
                  Password must be strong: include numbers, letters, and special symbols.
                </Typography>
              ) : (
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    mt: 1,
                    color: "success.main",
                    fontWeight: 600,
                  }}
                >
                  Strong password! You're ready to create your account.
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Stack>

      <LoadingButton
        fullWidth
        color="inherit"
        size="large"
        type="submit"
        variant="contained"
        loading={isLoading}
        sx={{
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
        Create Account
      </LoadingButton>
    </FormProvider>
  );
}
