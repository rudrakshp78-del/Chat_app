import { createSlice } from "@reduxjs/toolkit";

import axios from "../../utils/axios";
import { showSnackbar } from "./app";
import { socket, connectSocket } from "../../socket";

// ----------------------------------------------------------------------

const savedToken =
  typeof window !== "undefined" ? window.localStorage.getItem("token") : "";
const savedUserId =
  typeof window !== "undefined" ? window.localStorage.getItem("user_id") : null;

const initialState = {
  isLoggedIn: Boolean(savedToken),
  token: savedToken || "",
  isLoading: false,
  user: null,
  user_id: savedUserId || null,
  email: "",
  error: false,
};

const slice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    updateIsLoading(state, action) {
      state.error = action.payload.error;
      state.isLoading = action.payload.isLoading;
    },
    logIn(state, action) {
      state.isLoggedIn = action.payload.isLoggedIn;
      state.token = action.payload.token;
      state.user_id = action.payload.user_id;

      if (typeof window !== "undefined") {
        if (action.payload.token) {
          window.localStorage.setItem("token", action.payload.token);
        }
        if (action.payload.user_id) {
          window.localStorage.setItem("user_id", action.payload.user_id);
        }
      }
    },
    signOut(state, action) {
      state.isLoggedIn = false;
      state.token = "";
      state.user_id = null;

      if (typeof window !== "undefined") {
        window.localStorage.removeItem("token");
      window.localStorage.removeItem("accessToken");
        window.localStorage.removeItem("user_id");
      }
    },
    updateRegisterEmail(state, action) {
      state.email = action.payload.email;
    },
  },
});

// Reducer
export default slice.reducer;

export function NewPassword(formValues) {
  return async (dispatch, getState) => {
    dispatch(slice.actions.updateIsLoading({ isLoading: true, error: false }));

    await axios
      .post(
        "/auth/reset-password",
        {
          ...formValues,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
      .then(function (response) {
        console.log(response);
        dispatch(
          slice.actions.logIn({
            isLoggedIn: true,
            token: response.data.token,
          }),
        );
        dispatch(
          showSnackbar({ severity: "success", message: response.data.message }),
        );
        dispatch(
          slice.actions.updateIsLoading({ isLoading: false, error: false }),
        );
      })
      .catch(function (error) {
        console.log("VERIFY OTP ERROR:", error.response?.data);

        dispatch(
          showSnackbar({
            severity: "error",
            message: error.response?.data?.message || "OTP verification failed",
          }),
        );

        dispatch(
          slice.actions.updateIsLoading({
            error: true,
            isLoading: false,
          }),
        );
      });
  };
}

export function ForgotPassword(formValues) {
  return async (dispatch, getState) => {
    dispatch(slice.actions.updateIsLoading({ isLoading: true, error: false }));

    await axios
      .post(
        "/auth/forgot-password",
        {
          ...formValues,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
      .then(function (response) {
        console.log(response);

        dispatch(
          showSnackbar({ severity: "success", message: response.data.message }),
        );
        dispatch(
          slice.actions.updateIsLoading({ isLoading: false, error: false }),
        );
      })
      .catch(function (error) {
        console.log(error);
        dispatch(showSnackbar({ severity: "error", message: error.message }));
        dispatch(
          slice.actions.updateIsLoading({ isLoading: false, error: true }),
        );
      });
  };
}

export function LoginUser(formValues) {
  return async (dispatch, getState) => {
    dispatch(slice.actions.updateIsLoading({ isLoading: true, error: false }));

    try {
      const response = await axios.post(
        "/auth/login",
        {
          ...formValues,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      console.log(response);

      const token = response.data?.token;
      const user_id = response.data?.user_id;

      if (typeof window !== "undefined") {
        if (token) {
          window.localStorage.setItem("token", token);
        }
        if (user_id) {
          window.localStorage.setItem("user_id", user_id);
        }
      }

      dispatch(
        slice.actions.logIn({
          isLoggedIn: true,
          token,
          user_id,
        }),
      );

      try {
        if (user_id) {
          connectSocket(user_id);
        }
      } catch (err) {
        console.error("Socket connect error on login:", err);
      }

      dispatch(
        showSnackbar({
          severity: "success",
          message: response.data?.message || "Logged in successfully!",
        }),
      );

      dispatch(
        slice.actions.updateIsLoading({ isLoading: false, error: false }),
      );

      return true;
    } catch (error) {
      console.log(error);
      dispatch(
        showSnackbar({
          severity: "error",
          message:
            error.response?.data?.message ||
            error.message ||
            "Login failed",
        }),
      );
      dispatch(
        slice.actions.updateIsLoading({ isLoading: false, error: true }),
      );
      return false;
    }
  };
}

export function SocialLogin(socialData) {
  return async (dispatch) => {
    dispatch(slice.actions.updateIsLoading({ isLoading: true, error: false }));

    const normalizedEmail = (socialData.email || "").trim().toLowerCase();
    const firstName =
      (socialData.firstName || "").trim() ||
      normalizedEmail.split("@")[0] ||
      "User";
    const lastName =
      (socialData.lastName || "").trim() || socialData.provider || "Account";
    const provider = socialData.provider || "Social";
    const avatar = socialData.avatar || "";

    const completeSocialLogin = (response) => {
      const { token, user_id, message } = response.data;
      dispatch(
        slice.actions.logIn({
          isLoggedIn: true,
          token,
          user_id,
        }),
      );
      window.localStorage.setItem("user_id", user_id);
      window.localStorage.setItem("token", token);

      // Save account in local social account chooser for 1-click future sign-ins
      try {
        const savedAccounts = JSON.parse(
          window.localStorage.getItem("tawk_social_accounts") || "[]",
        );
        const filtered = savedAccounts.filter(
          (acc) =>
            !(
              acc.email === normalizedEmail &&
              acc.provider.toLowerCase() === provider.toLowerCase()
            ),
        );
        filtered.unshift({
          email: normalizedEmail,
          firstName,
          lastName,
          provider,
          avatar,
        });
        window.localStorage.setItem(
          "tawk_social_accounts",
          JSON.stringify(filtered.slice(0, 6)),
        );
      } catch (e) {
        // Ignore storage errors
      }

      dispatch(
        showSnackbar({
          severity: "success",
          message: message || `Logged in with ${provider} successfully!`,
        }),
      );
      dispatch(
        slice.actions.updateIsLoading({ isLoading: false, error: false }),
      );
    };

    try {
      // 1) Primary social login endpoint
      const response = await axios.post(
        "/auth/social-login",
        {
          email: normalizedEmail,
          firstName,
          lastName,
          provider,
          avatar,
        },
        {
          headers: { "Content-Type": "application/json" },
        },
      );
      completeSocialLogin(response);
      return true;
    } catch (primaryError) {
      // 2) Fallback if backend hasn't deployed /auth/social-login yet
      const socialPassword =
        socialData.password || `SocialAuth#${normalizedEmail}#Tawk`;
      try {
        const loginRes = await axios.post(
          "/auth/login",
          {
            email: normalizedEmail,
            password: socialPassword,
          },
          {
            headers: { "Content-Type": "application/json" },
          },
        );
        completeSocialLogin(loginRes);
        return true;
      } catch (loginErr) {
        try {
          // Register the social user then log in immediately
          await axios
            .post(
              "/auth/register",
              {
                firstName,
                lastName,
                email: normalizedEmail,
                password: socialPassword,
              },
              {
                headers: { "Content-Type": "application/json" },
              },
            )
            .catch(() => {});

          const retryLoginRes = await axios.post(
            "/auth/login",
            {
              email: normalizedEmail,
              password: socialPassword,
            },
            {
              headers: { "Content-Type": "application/json" },
            },
          );
          completeSocialLogin(retryLoginRes);
          return true;
        } catch (fallbackErr) {
          const errMsg =
            fallbackErr?.message ||
            primaryError?.message ||
            `Could not sign in with ${provider}. If this email is already registered with a password, please enter your password or sign in via the form.`;
          dispatch(showSnackbar({ severity: "error", message: errMsg }));
          dispatch(
            slice.actions.updateIsLoading({ isLoading: false, error: true }),
          );
          return false;
        }
      }
    }
  };
}

export function LogoutUser() {
  return async (dispatch, getState) => {
    try {
      const user_id =
        typeof window !== "undefined"
          ? window.localStorage.getItem("user_id")
          : null;
      if (socket) {
        if (user_id && socket.connected) {
          socket.emit("end", { user_id });
        }
        socket.disconnect();
      }
    } catch (e) {
      console.error("Socket error on logout:", e);
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("user_id");
      window.localStorage.removeItem("token");
      window.localStorage.removeItem("accessToken");
      window.localStorage.removeItem("trackon_cached_conversations");
    }

    dispatch(slice.actions.signOut());
    dispatch(
      showSnackbar({
        severity: "success",
        message: "Logged out successfully",
      })
    );
  };
}

export function RegisterUser(formValues) {
  return async (dispatch, getState) => {
    dispatch(slice.actions.updateIsLoading({ isLoading: true, error: false }));

    const normalizedEmail = (formValues.email || "").trim().toLowerCase();

    try {
      const response = await axios.post(
        "/auth/register",
        {
          ...formValues,
          email: normalizedEmail,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      console.log("Register response:", response.data);

      dispatch(
        slice.actions.updateRegisterEmail({ email: normalizedEmail }),
      );

      if (typeof window !== "undefined") {
        window.localStorage.setItem("verify_email", normalizedEmail);
        if (response.data?.otp || response.data?.dev_otp) {
          window.localStorage.setItem(
            "dev_otp",
            String(response.data?.otp || response.data?.dev_otp),
          );
        }
      }

      dispatch(
        showSnackbar({
          severity: "success",
          message:
            response.data?.message ||
            "Registration successful! Please verify your email.",
        }),
      );

      dispatch(
        slice.actions.updateIsLoading({ isLoading: false, error: false }),
      );

      if (typeof window !== "undefined") {
        window.location.href = "/auth/verify";
      }
      return true;
    } catch (error) {
      console.error("Register error:", error);
      let errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        (typeof error === "string" ? error : "Registration failed. Please try again.");

      if (typeof errorMsg === "string" && (errorMsg.includes("<!DOCTYPE") || errorMsg.includes("<html"))) {
        errorMsg = "Backend server error. Please try again shortly.";
      }

      dispatch(showSnackbar({ severity: "error", message: errorMsg }));
      dispatch(
        slice.actions.updateIsLoading({ error: true, isLoading: false }),
      );
      return false;
    }
  };
}

export function VerifyEmail(formValues) {
  return async (dispatch, getState) => {
    console.log("VERIFY FORM VALUES:", formValues);

    dispatch(slice.actions.updateIsLoading({ isLoading: true, error: false }));

    const normalizedEmail = (formValues.email || "").trim().toLowerCase();

    try {
      const response = await axios.post(
        "/auth/verify",
        {
          ...formValues,
          email: normalizedEmail,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      console.log("Verify response:", response.data);
      dispatch(slice.actions.updateRegisterEmail({ email: "" }));

      if (typeof window !== "undefined") {
        window.localStorage.removeItem("verify_email");
        window.localStorage.removeItem("dev_otp");
        if (response.data?.user_id) {
          window.localStorage.setItem("user_id", response.data.user_id);
        }
        if (response.data?.token) {
          window.localStorage.setItem("token", response.data.token);
        }
        window.localStorage.setItem("first_time_signup", "true");
      }

      dispatch(
        slice.actions.logIn({
          isLoggedIn: true,
          token: response.data.token,
          user_id: response.data.user_id,
        }),
      );

      try {
        if (response.data?.user_id) {
          connectSocket(response.data.user_id);
        }
      } catch (err) {
        console.error("Socket connect error after verify:", err);
      }

      dispatch(
        showSnackbar({
          severity: "success",
          message: response.data?.message || "Account verified successfully!",
        }),
      );

      dispatch(
        slice.actions.updateIsLoading({ isLoading: false, error: false }),
      );

      return true;
    } catch (error) {
      console.error("Verify error:", error);
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        (typeof error === "string" ? error : "OTP verification failed");

      dispatch(showSnackbar({ severity: "error", message: errorMsg }));
      dispatch(
        slice.actions.updateIsLoading({ error: true, isLoading: false }),
      );
      return false;
    }
  };
}

export function ResendOTP(email) {
  return async (dispatch, getState) => {
    dispatch(slice.actions.updateIsLoading({ isLoading: true, error: false }));

    const normalizedEmail = (email || "").trim().toLowerCase();

    try {
      const response = await axios.post(
        "/auth/resend-otp",
        { email: normalizedEmail },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (
        typeof window !== "undefined" &&
        (response.data?.otp || response.data?.dev_otp)
      ) {
        window.localStorage.setItem(
          "dev_otp",
          String(response.data?.otp || response.data?.dev_otp),
        );
      }

      dispatch(
        showSnackbar({
          severity: "success",
          message: response.data?.message || "OTP resent successfully!",
        }),
      );

      dispatch(
        slice.actions.updateIsLoading({ isLoading: false, error: false }),
      );
      return true;
    } catch (error) {
      console.error("Resend OTP error:", error);
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        (typeof error === "string" ? error : "Failed to resend OTP");

      dispatch(showSnackbar({ severity: "error", message: errorMsg }));
      dispatch(
        slice.actions.updateIsLoading({ error: true, isLoading: false }),
      );
      return false;
    }
  };
}
