import * as Yup from "yup";
// form
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
// @mui
import { Stack, Button, Typography, Link } from "@mui/material";
// components
import FormProvider from "../../components/hook-form";
import RHFCodes from "../../components/hook-form/RHFCodes";
import { useDispatch, useSelector } from "react-redux";
import { VerifyEmail, ResendOTP } from "../../redux/slices/auth";
import { showSnackbar } from "../../redux/slices/app";

// ----------------------------------------------------------------------

export default function VerifyForm() {
  const dispatch = useDispatch();
  const reduxEmail = useSelector((state) => state.auth.email);
  const isLoading = useSelector((state) => state.auth.isLoading);

  const email =
    reduxEmail ||
    (typeof window !== "undefined"
      ? window.localStorage.getItem("verify_email")
      : "") ||
    "";

  const VerifyCodeSchema = Yup.object().shape({
    code1: Yup.string().required("Code is required"),
    code2: Yup.string().required("Code is required"),
    code3: Yup.string().required("Code is required"),
    code4: Yup.string().required("Code is required"),
    code5: Yup.string().required("Code is required"),
    code6: Yup.string().required("Code is required"),
  });

  const defaultValues = {
    code1: "",
    code2: "",
    code3: "",
    code4: "",
    code5: "",
    code6: "",
  };

  const methods = useForm({
    mode: "onChange",
    resolver: yupResolver(VerifyCodeSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = async (data) => {
    try {
      const emailToVerify =
        email ||
        (typeof window !== "undefined"
          ? window.localStorage.getItem("verify_email")
          : "") ||
        "";

      if (!emailToVerify) {
        dispatch(
          showSnackbar({
            severity: "error",
            message: "Email address not found. Please register again.",
          })
        );
        return;
      }

      dispatch(
        VerifyEmail({
          email: emailToVerify,
          otp: `${data.code1}${data.code2}${data.code3}${data.code4}${data.code5}${data.code6}`,
        }),
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleResend = () => {
    const emailToVerify =
      email ||
      (typeof window !== "undefined"
        ? window.localStorage.getItem("verify_email")
        : "") ||
      "";

    if (!emailToVerify) {
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Email address not found. Please register again.",
        })
      );
      return;
    }
    dispatch(ResendOTP(emailToVerify));
  };

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={3}>
        <RHFCodes
          keyName="code"
          inputs={["code1", "code2", "code3", "code4", "code5", "code6"]}
        />

        <Button
          fullWidth
          size="large"
          type="submit"
          variant="contained"
          disabled={isSubmitting || isLoading}
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
          {isLoading ? "Verifying..." : "Verify"}
        </Button>

        <Stack direction="row" justifyContent="center" spacing={1} sx={{ mt: 2 }}>
          <Typography variant="body2">Didn't receive the code?</Typography>
          <Link
            variant="subtitle2"
            sx={{ cursor: "pointer" }}
            onClick={handleResend}
          >
            Resend code
          </Link>
        </Stack>
      </Stack>
    </FormProvider>
  );
}
