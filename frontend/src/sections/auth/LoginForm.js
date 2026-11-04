import { useState, useRef } from "react";
import * as Yup from "yup";
import { Link as RouterLink, useNavigate } from "react-router-dom";
// form
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
// @mui
import { Link, Stack, Alert, IconButton, InputAdornment } from "@mui/material";
import { LoadingButton } from "@mui/lab";
// components
import FormProvider, { RHFTextField } from "../../components/hook-form";
import { Eye, EyeSlash } from "phosphor-react";
import { LoginUser } from "../../redux/slices/auth";
import { useDispatch, useSelector } from "react-redux";

// ----------------------------------------------------------------------

export default function AuthLoginForm() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const isSubmittingRef = useRef(false);

  const { isLoading } = useSelector((state) => state.auth);

  const LoginSchema = Yup.object().shape({
    email: Yup.string()
      .trim()
      .required("Email is required")
      .email("Email must be a valid email address"),
    password: Yup.string().required("Password is required"),
  });

  const defaultValues = {
    email: "",
    password: "",
  };

  const methods = useForm({
    mode: "onChange",
    resolver: yupResolver(LoginSchema),
    defaultValues,
  });

  const {
    reset,
    setError,
    handleSubmit,
    formState: { errors },
  } = methods;

  const onSubmit = async (data) => {
    if (isSubmittingRef.current || isLoading) return;
    isSubmittingRef.current = true;

    try {
      // Dismiss keyboard on submit
      if (document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
      }

      const success = await dispatch(LoginUser(data));
      if (success) {
        navigate("/app", { replace: true });
      }
    } catch (error) {
      console.error(error);
      reset();
      setError("afterSubmit", {
        ...error,
        message: error.message,
      });
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleSingleTapSubmit = (e) => {
    if (e && typeof e.preventDefault === "function" && e.cancelable && e.type !== "click") {
      e.preventDefault();
    }
    handleSubmit(onSubmit)();
  };

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={3}>
        {!!errors.afterSubmit && (
          <Alert severity="error">{errors.afterSubmit.message}</Alert>
        )}

        <RHFTextField name="email" label="Email address" />

        <RHFTextField
          name="password"
          label="Password"
          type={showPassword ? "text" : "password"}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSingleTapSubmit(e);
            }
          }}
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
      </Stack>

      <Stack alignItems="flex-end" sx={{ my: 2 }}>
        <Link
          component={RouterLink}
          to="/auth/reset-password"
          variant="body2"
          color="inherit"
          underline="always"
        >
          Forgot password?
        </Link>
      </Stack>

      <LoadingButton
        fullWidth
        color="inherit"
        size="large"
        type="submit"
        variant="contained"
        loading={isLoading}
        onMouseDown={(e) => {
          // Prevents focus-blur race condition on desktop
          e.preventDefault();
        }}
        onTouchStart={(e) => {
          // On mobile / Android touchscreens, prevents the soft keyboard
          // dismissal from swallowing this tap as a "close keyboard" gesture!
          handleSingleTapSubmit(e);
        }}
        onClick={handleSingleTapSubmit}
        sx={{
          bgcolor: "text.primary",
          color: (theme) =>
            theme.palette.mode === "light" ? "common.white" : "grey.800",
          "&:hover": {
            bgcolor: "text.primary",
            color: (theme) =>
              theme.palette.mode === "light" ? "common.white" : "grey.800",
          },
          "&.MuiLoadingButton-loading": {
            bgcolor: "text.primary",
            opacity: 0.85,
          },
          "& .MuiLoadingButton-loadingIndicator": {
            color: (theme) =>
              theme.palette.mode === "light" ? "common.white" : "grey.800",
          },
        }}
      >
        Login
      </LoadingButton>
    </FormProvider>
  );
}
