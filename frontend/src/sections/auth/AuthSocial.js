import React, { useState, useEffect } from "react";
// @mui
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { GithubLogo, GoogleLogo, TwitterLogo, UserPlus, X } from "phosphor-react";
import { useDispatch, useSelector } from "react-redux";
import { SocialLogin } from "../../redux/slices/auth";
import { showSnackbar } from "../../redux/slices/app";

// ----------------------------------------------------------------------

const PROVIDERS = {
  Google: {
    name: "Google",
    color: "#DF3E30",
    bgLight: "rgba(223, 62, 48, 0.1)",
    icon: GoogleLogo,
    placeholderEmail: "yourname@gmail.com",
    label: "Google Email Address",
    domain: "gmail.com",
  },
  GitHub: {
    name: "GitHub",
    color: "#24292F",
    bgLight: "rgba(36, 41, 47, 0.1)",
    icon: GithubLogo,
    placeholderEmail: "username or email@github.com",
    label: "GitHub Email or Username",
    domain: "github.com",
  },
  Twitter: {
    name: "Twitter",
    color: "#1C9CEA",
    bgLight: "rgba(28, 156, 234, 0.1)",
    icon: TwitterLogo,
    placeholderEmail: "@handle or email@example.com",
    label: "Twitter Email or @Username",
    domain: "twitter.com",
  },
};

export default function AuthSocial() {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.auth);

  const [activeProvider, setActiveProvider] = useState(null);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [showNewAccountForm, setShowNewAccountForm] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [formError, setFormError] = useState("");

  // Handle Google OAuth redirect hash if returned from Google OAuth popup/redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash && hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      if (accessToken) {
        window.history.replaceState(null, "", window.location.pathname);
        fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((res) => res.json())
          .then((profile) => {
            if (profile && profile.email) {
              dispatch(
                SocialLogin({
                  email: profile.email,
                  firstName: profile.given_name || profile.name || "Google",
                  lastName: profile.family_name || "User",
                  avatar: profile.picture || "",
                  provider: "Google",
                }),
              );
            }
          })
          .catch(() => {
            dispatch(
              showSnackbar({
                severity: "error",
                message: "Google authentication failed. Please try again.",
              }),
            );
          });
      }
    }
  }, [dispatch]);

  const loadSavedAccounts = (providerName) => {
    try {
      const all = JSON.parse(
        window.localStorage.getItem("tawk_social_accounts") || "[]",
      );
      return all.filter(
        (acc) => acc.provider?.toLowerCase() === providerName.toLowerCase(),
      );
    } catch {
      return [];
    }
  };

  const openProviderDialog = (providerName) => {
    const accounts = loadSavedAccounts(providerName);
    setSavedAccounts(accounts);
    setShowNewAccountForm(accounts.length === 0);
    setEmailInput("");
    setNameInput("");
    setFormError("");
    setActiveProvider(providerName);
  };

  const handleGoogleLogin = async () => {
    const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (googleClientId) {
      const redirectUri = `${window.location.origin}/auth/login`;
      const scope = encodeURIComponent("openid email profile");
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&response_type=token&scope=${scope}&prompt=select_account`;
      window.location.href = authUrl;
      return;
    }
    openProviderDialog("Google");
  };

  const handleGithubLogin = async () => {
    openProviderDialog("GitHub");
  };

  const handleTwitterLogin = async () => {
    openProviderDialog("Twitter");
  };

  const handleClose = () => {
    if (isLoading) return;
    setActiveProvider(null);
    setFormError("");
  };

  const handleSelectSavedAccount = async (account) => {
    const success = await dispatch(
      SocialLogin({
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        avatar: account.avatar,
        provider: account.provider,
      }),
    );
    if (success) {
      setActiveProvider(null);
    }
  };

  const handleContinueWithNewAccount = async (e) => {
    e.preventDefault();
    if (!activeProvider) return;

    const providerCfg = PROVIDERS[activeProvider];
    let rawIdentifier = emailInput.trim();

    if (!rawIdentifier) {
      setFormError(`Please enter your ${providerCfg.label}`);
      return;
    }

    // Allow @username or username for GitHub/Twitter, or convert to valid email format
    let finalEmail = rawIdentifier.toLowerCase();
    if (!finalEmail.includes("@") || finalEmail.startsWith("@")) {
      const cleanHandle = finalEmail.replace(/^@+/, "").replace(/[^a-z0-9._-]/g, "");
      if (!cleanHandle) {
        setFormError("Please enter a valid email or username");
        return;
      }
      if (activeProvider === "Google") {
        finalEmail = `${cleanHandle}@gmail.com`;
      } else {
        finalEmail = `${cleanHandle}@${providerCfg.domain}`;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(finalEmail)) {
      setFormError("Please enter a valid email address");
      return;
    }

    const fullName = nameInput.trim();
    const nameParts = fullName ? fullName.split(/\s+/) : [];
    const defaultHandle = finalEmail.split("@")[0];
    const firstName =
      nameParts[0] ||
      defaultHandle.charAt(0).toUpperCase() + defaultHandle.slice(1);
    const lastName =
      nameParts.slice(1).join(" ") || `${activeProvider} User`;

    setFormError("");
    const success = await dispatch(
      SocialLogin({
        email: finalEmail,
        firstName,
        lastName,
        provider: activeProvider,
      }),
    );

    if (success) {
      setActiveProvider(null);
    }
  };

  const currentProvider = activeProvider ? PROVIDERS[activeProvider] : null;
  const ProviderIcon = currentProvider?.icon;

  return (
    <div>
      <Divider
        sx={{
          my: 2.5,
          typography: "overline",
          color: "text.disabled",
          "&::before, ::after": {
            borderTopStyle: "dashed",
          },
        }}
      >
        OR
      </Divider>

      <Stack direction="row" justifyContent="center" spacing={2}>
        <Tooltip title="Continue with Google">
          <IconButton
            onClick={handleGoogleLogin}
            disabled={isLoading}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              p: 1.2,
              "&:hover": { bgcolor: "rgba(223, 62, 48, 0.08)" },
            }}
          >
            <GoogleLogo color="#DF3E30" size={22} weight="bold" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Continue with GitHub">
          <IconButton
            color="inherit"
            onClick={handleGithubLogin}
            disabled={isLoading}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              p: 1.2,
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <GithubLogo size={22} weight="bold" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Continue with Twitter">
          <IconButton
            onClick={handleTwitterLogin}
            disabled={isLoading}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              p: 1.2,
              "&:hover": { bgcolor: "rgba(28, 156, 234, 0.08)" },
            }}
          >
            <TwitterLogo color="#1C9CEA" size={22} weight="bold" />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Social Auth Account Chooser & Login Modal */}
      <Dialog
        open={Boolean(activeProvider)}
        onClose={handleClose}
        fullWidth
        maxWidth="xs"
      >
        {currentProvider && (
          <>
            <DialogTitle
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                pb: 1.5,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: currentProvider.bgLight,
                    color: currentProvider.color,
                    display: "flex",
                  }}
                >
                  {ProviderIcon && <ProviderIcon size={24} weight="bold" />}
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Sign in with {currentProvider.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    to continue to Trackon
                  </Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={handleClose} disabled={isLoading}>
                <X size={18} />
              </IconButton>
            </DialogTitle>

            <Divider />

            <DialogContent sx={{ py: 2.5 }}>
              {savedAccounts.length > 0 && !showNewAccountForm ? (
                <Stack spacing={1.5}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Choose an account
                  </Typography>
                  <List disablePadding>
                    {savedAccounts.map((acc) => (
                      <ListItemButton
                        key={acc.email}
                        onClick={() => handleSelectSavedAccount(acc)}
                        disabled={isLoading}
                        sx={{
                          borderRadius: 1.5,
                          border: "1px solid",
                          borderColor: "divider",
                          mb: 1,
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            src={acc.avatar}
                            sx={{
                              bgcolor: currentProvider.color,
                              color: "#fff",
                              fontWeight: 700,
                            }}
                          >
                            {(acc.firstName || acc.email || "U")[0].toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${acc.firstName || ""} ${acc.lastName || ""}`.trim()}
                          secondary={acc.email}
                          primaryTypographyProps={{ variant: "subtitle2" }}
                          secondaryTypographyProps={{ variant: "caption" }}
                        />
                      </ListItemButton>
                    ))}

                    <ListItemButton
                      onClick={() => setShowNewAccountForm(true)}
                      disabled={isLoading}
                      sx={{ borderRadius: 1.5 }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: "action.hover", color: "text.primary" }}>
                          <UserPlus size={20} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Use another account"
                        primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                      />
                    </ListItemButton>
                  </List>
                </Stack>
              ) : (
                <Box component="form" onSubmit={handleContinueWithNewAccount}>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label={currentProvider.label}
                      placeholder={currentProvider.placeholderEmail}
                      value={emailInput}
                      onChange={(e) => {
                        setEmailInput(e.target.value);
                        if (formError) setFormError("");
                      }}
                      error={Boolean(formError)}
                      helperText={formError}
                      autoFocus
                      disabled={isLoading}
                    />

                    <TextField
                      fullWidth
                      size="small"
                      label="Your Name (optional)"
                      placeholder="e.g. Rudraksh Paliwal"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      disabled={isLoading}
                    />

                    {savedAccounts.length > 0 && (
                      <Button
                        size="small"
                        onClick={() => setShowNewAccountForm(false)}
                        sx={{ alignSelf: "flex-start", textTransform: "none" }}
                        disabled={isLoading}
                      >
                        ← Back to saved accounts
                      </Button>
                    )}

                    <DialogActions sx={{ px: 0, pb: 0, pt: 1 }}>
                      <Button
                        onClick={handleClose}
                        color="inherit"
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={isLoading}
                        sx={{
                          bgcolor: currentProvider.color,
                          color: "#fff",
                          "&:hover": {
                            bgcolor: currentProvider.color,
                            opacity: 0.9,
                          },
                        }}
                      >
                        {isLoading ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          `Continue with ${currentProvider.name}`
                        )}
                      </Button>
                    </DialogActions>
                  </Stack>
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </div>
  );
}