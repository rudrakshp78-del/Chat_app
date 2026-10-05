import { createSlice } from "@reduxjs/toolkit";

import axios from "../../utils/axios";
import { showSnackbar } from "./app";

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
    // Make API call here

    dispatch(slice.actions.updateIsLoading({ isLoading: true, error: false }));

    await axios
      .post(
        "/auth/login",
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
            user_id: response.data.user_id,
          }),
        );
        window.localStorage.setItem("user_id", response.data.user_id);
        dispatch(
          showSnackbar({ severity: "success", message: response.data.message }),
        );
        dispatch(
          slice.actions.updateIsLoading({ isLoading: false, error: false }),
        );
      })
      .catch(function (error) {
        console.log(error);
        dispatch(
          showSnackbar({
            severity: "error",
            message: error.message || "Login failed",
          }),
        );
        dispatch(
          slice.actions.updateIsLoading({ isLoading: false, error: true }),
        );
      });
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
    window.localStorage.removeItem("user_id");
    window.localStorage.removeItem("token");
    dispatch(slice.actions.signOut());
  };
}

export function RegisterUser(formValues) {
  return async (dispatch, getState) => {
    dispatch(slice.actions.updateIsLoading({ isLoading: true, error: false }));

    await axios
      .post(
        "/auth/register",
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
          slice.actions.updateRegisterEmail({ email: formValues.email }),
        );

        window.localStorage.setItem("verify_email", formValues.email);

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
          slice.actions.updateIsLoading({ error: true, isLoading: false }),
        );
      })
      .finally(() => {
        if (!getState().auth.error) {
          window.location.href = "/auth/verify";
        }
      });
  };
}

export function VerifyEmail(formValues) {
  return async (dispatch, getState) => {
    console.log("VERIFY FORM VALUES:", formValues);

    dispatch(slice.actions.updateIsLoading({ isLoading: true, error: false }));


    await axios
      .post(
        "/auth/verify",
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
        dispatch(slice.actions.updateRegisterEmail({ email: "" }));
        window.localStorage.removeItem("verify_email");
        window.localStorage.setItem("user_id", response.data.user_id);
        window.localStorage.setItem("token", response.data.token);
        dispatch(
          slice.actions.logIn({
            isLoggedIn: true,
            token: response.data.token,
            user_id: response.data.user_id,
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
        console.log(error);
        const errorMsg =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "OTP verification failed";
        dispatch(showSnackbar({ severity: "error", message: errorMsg }));
        dispatch(
          slice.actions.updateIsLoading({ error: true, isLoading: false }),
        );
      });
  };
}

export function ResendOTP(email) {
  return async (dispatch, getState) => {
    dispatch(slice.actions.updateIsLoading({ isLoading: true, error: false }));

    await axios
      .post(
        "/auth/resend-otp",
        { email },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
      .then(function (response) {
        dispatch(
          showSnackbar({
            severity: "success",
            message: response.data.message || "OTP resent successfully!",
          }),
        );
        dispatch(
          slice.actions.updateIsLoading({ isLoading: false, error: false }),
        );
      })
      .catch(function (error) {
        const errorMsg =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Failed to resend OTP";
        dispatch(showSnackbar({ severity: "error", message: errorMsg }));
        dispatch(
          slice.actions.updateIsLoading({ error: true, isLoading: false }),
        );
      });
  };
}
