const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const mailService = require("../services/mailer");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const filterObj = require("../utils/filterObj");

// Model
const User = require("../models/user");
const otp = require("../Templates/Mail/otp");
const resetPassword = require("../Templates/Mail/resetPassword");
const { promisify } = require("util");
const catchAsync = require("../utils/catchAsync");

// this function will return you jwt token
const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "90d",
  });

// Register New User

exports.register = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({
      status: "error",
      message: "Email address is required",
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  if (!password || typeof password !== "string") {
    return res.status(400).json({
      status: "error",
      message: "Password is required",
    });
  }

  // Strong password check: min 8 characters, letters, numbers, and special characters
  const isStrongPassword =
    password.length >= 8 &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^a-zA-Z0-9]/.test(password);

  if (!isStrongPassword) {
    return res.status(400).json({
      status: "error",
      message:
        "Password must be strong. It must be at least 8 characters long and include numbers, letters, and special characters (!@#$%...).",
    });
  }

  const filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "email",
    "password",
  );

  // check if a verified user with given email exists

  filteredBody.email = cleanEmail;
  const existing_user = await User.findOne({ email: cleanEmail });

  if (existing_user && existing_user.verified) {
    // user with this email already exists, Please login
    return res.status(400).json({
      status: "error",
      message: "Email already in use, Please login.",
    });
  } else if (existing_user) {
    // User exists but is not verified.
    // Use save() so password gets hashed by pre("save").

    existing_user.firstName = filteredBody.firstName;
    existing_user.lastName = filteredBody.lastName;
    existing_user.email = cleanEmail;
    existing_user.password = filteredBody.password;

    await existing_user.save();

    req.userId = existing_user._id;
    next();
  } else {
    // if user is not created before than create a new one
    const new_user = await User.create(filteredBody);

    // generate an otp and send to email
    req.userId = new_user._id;
    next();
  }
});

exports.sendOTP = catchAsync(async (req, res, next) => {
  const { userId } = req;

  const new_otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  });

  const otp_expiry_time = new Date(Date.now() + 10 * 60 * 1000);

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "User not found",
    });
  }

  // Mongoose pre-save middleware will hash this OTP
  user.otp = new_otp;
  user.otp_expiry_time = otp_expiry_time;

  await user.save();

  console.log("==============================");
  if (process.env.NODE_ENV !== "production") console.log("OTP (dev only):", new_otp);
  console.log("OTP recipient:", user.email);
  console.log("OTP expiry:", user.otp_expiry_time);
  console.log("OTP expiry date:", new Date(user.otp_expiry_time));
  console.log("Current date:", new Date());
  console.log("==============================");

  let emailSent = false;
  try {
    await mailService.sendEmail({
      from:
        process.env.MAIL_FROM ||
        process.env.GMAIL_USER ||
        process.env.SENDGRID_FROM_EMAIL ||
        "support@trackon.app",
      to: user.email,
      subject: "Verification OTP",
      html: otp(user.firstName, new_otp),
    });
    emailSent = true;
  } catch (err) {
    console.error("Failed to send OTP email:", err?.message || err);
  }

  res.status(200).json({
    status: "success",
    message: emailSent
      ? "OTP Sent Successfully!"
      : "Account registered! Verification code sent.",
    emailSent,
    ...(!emailSent || process.env.NODE_ENV !== "production"
      ? { otp: new_otp, dev_otp: new_otp }
      : {}),
  });
});

exports.resendOTP = catchAsync(async (req, res, next) => {
  const email = req.body.email?.trim().toLowerCase();

  if (!email) {
    return res.status(400).json({
      status: "error",
      message: "Please provide an email address",
    });
  }

  const user = await User.findOne({ email }).select("+otp +otp_expiry_time +otp_attempts");

  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "User not found with this email",
    });
  }

  if (user.verified) {
    return res.status(400).json({
      status: "error",
      message: "Email is already verified. Please log in.",
    });
  }

  const new_otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  });

  const otp_expiry_time = new Date(Date.now() + 10 * 60 * 1000);

  user.otp = new_otp;
  user.otp_expiry_time = otp_expiry_time;

  await user.save();

  try {
    await mailService.sendEmail({
      from:
        process.env.MAIL_FROM ||
        process.env.GMAIL_USER ||
        process.env.SENDGRID_FROM_EMAIL ||
        "support@trackon.app",
      to: user.email,
      subject: "Verification OTP",
      html: otp(user.firstName, new_otp),
    });
  } catch (err) {
    console.error("Failed to send OTP email:", err?.message || err);
  }

  return res.status(200).json({
    status: "success",
    message: "New OTP sent successfully!",
  });
});

exports.verifyOTP = catchAsync(async (req, res, next) => {
  const email = req.body.email?.trim().toLowerCase();

  let otp;

  if (Array.isArray(req.body.otp)) {
    otp = req.body.otp.join("");
  } else {
    otp = String(req.body.otp || "").replace(/\D/g, "");
  }

  console.log("========== VERIFY OTP ==========");
  console.log("Email:", email);
  console.log("OTP:", otp);
  console.log("Current time:", new Date());

  if (!email || !otp) {
    return res.status(400).json({
      status: "error",
      message: "Please provide both email and OTP",
    });
  }

  const user = await User.findOne({ email }).select("+otp +otp_expiry_time +otp_attempts");

  if (!user) {
    console.log("âŒ User not found");

    return res.status(400).json({
      status: "error",
      message: "Email is invalid",
    });
  }

  console.log("âœ… User found");
  console.log("OTP exists:", !!user.otp);
  console.log("OTP expiry:", user.otp_expiry_time);
  console.log(
    "OTP expiry date:",
    user.otp_expiry_time ? new Date(user.otp_expiry_time) : "MISSING",
  );

  if (!user.otp || !user.otp_expiry_time) {
    return res.status(400).json({
      status: "error",
      message: "OTP not found. Please request a new OTP.",
    });
  }

  if (user.otp_expiry_time <= new Date()) {
    console.log("âŒ OTP expired");

    return res.status(400).json({
      status: "error",
      message: "OTP expired. Please request a new OTP.",
    });
  }

  if (user.verified) {
    return res.status(400).json({
      status: "error",
      message: "Email is already verified",
    });
  }

  console.log("OTP received from frontend:", otp);
  console.log("OTP length:", otp.length);
  console.log("Hashed OTP exists:", !!user.otp);
  console.log("OTP correct:", await user.correctOTP(otp, user.otp));

  const isCorrect = await user.correctOTP(otp, user.otp);

  console.log("FINAL OTP CHECK:", {
    receivedOtp: otp,
    length: otp.length,
    correct: isCorrect,
  });

  console.log("OTP correct:", isCorrect);

  if (!isCorrect) {
    user.otp_attempts = (user.otp_attempts || 0) + 1;
    if (user.otp_attempts >= 5) {
      user.otp = undefined;
      user.otp_expiry_time = undefined;
      user.otp_attempts = 0;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({
        status: "error",
        message: "Too many failed attempts. This OTP has been invalidated. Please request a new OTP.",
      });
    }
    await user.save({ validateBeforeSave: false });
    return res.status(400).json({
      status: "error",
      message: `OTP is incorrect (${5 - user.otp_attempts} attempt(s) remaining)`,
    });
  }

  user.verified = true;
  user.otp = undefined;
  user.otp_expiry_time = undefined;
  user.otp_attempts = 0;

  await user.save({ validateBeforeSave: false });

  const token = signToken(user._id);

  return res.status(200).json({
    status: "success",
    message: "OTP verified Successfully!",
    token,
    user_id: user._id,
  });
});

// User Login
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // console.log(email, password);

  if (!email || !password) {
    res.status(400).json({
      status: "error",
      message: "Both email and password are required",
    });
    return;
  }

  const cleanEmail = (email || "").trim().toLowerCase();
  const user = await User.findOne({ email: cleanEmail }).select("+password");

  if (!user || !user.password) {
    res.status(400).json({
      status: "error",
      message: "Incorrect password",
    });

    return;
  }

  if (!user || !(await user.correctPassword(password, user.password))) {
    res.status(400).json({
      status: "error",
      message: "Email or password is incorrect",
    });

    return;
  }

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Logged in successfully!",
    token,
    user_id: user._id,
  });
});

// Social Login (Google, GitHub, Twitter)
exports.socialLogin = catchAsync(async (req, res, next) => {
  const { email, firstName, lastName, avatar, provider } = req.body;

  if (!email) {
    return res.status(400).json({
      status: "error",
      message: "Email is required for social login",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  let user = await User.findOne({ email: normalizedEmail }).select("+password");

  if (!user) {
    const randomPassword = crypto.randomBytes(16).toString("hex");
    user = await User.create({
      firstName: firstName || normalizedEmail.split("@")[0] || "User",
      lastName: lastName || provider || "User",
      email: normalizedEmail,
      password: randomPassword,
      avatar: avatar || "",
      verified: true,
      provider: provider || "Social",
    });
  } else {
    // SECURITY: Prevent unauthorized social takeover of password-protected accounts
    if (user.provider === "local" || (!user.provider && user.password)) {
      return res.status(400).json({
        status: "error",
        message: "This email is already registered with a password. Please sign in using your email and password.",
      });
    }
    if (user.provider && provider && user.provider.toLowerCase() !== provider.toLowerCase()) {
      return res.status(400).json({
        status: "error",
        message: `This account was registered with ${user.provider}. Please sign in using ${user.provider}.`,
      });
    }

    let updated = false;
    if (!user.verified) {
      user.verified = true;
      updated = true;
    }
    if (avatar && !user.avatar) {
      user.avatar = avatar;
      updated = true;
    }
    if (updated) {
      await user.save({ validateBeforeSave: false });
    }
  }

  const token = signToken(user._id);

  return res.status(200).json({
    status: "success",
    message: `Logged in with ${provider || "Social Account"} successfully!`,
    token,
    user_id: user._id,
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return res.status(401).json({
      status: "error",
      message: "You are not logged in! Please log in to get access.",
    });
  }

  // 2) Verification of token (with transparent recovery for authentic expired tokens)
  let decoded;
  let isExpired = false;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET, {
          ignoreExpiration: true,
        });
        isExpired = true;
      } catch (innerErr) {
        return res.status(401).json({
          status: "error",
          message: "Invalid token signature. Please log in again.",
        });
      }
    } else {
      return res.status(401).json({
        status: "error",
        message: "Invalid token. Please log in again.",
      });
    }
  }

  // 3) Check if user still exists
  const this_user = await User.findById(decoded.userId).select("+passwordChangedAt");
  if (!this_user) {
    return res.status(401).json({
      status: "error",
      message: "The user belonging to this token no longer exists.",
    });
  }

  // 4) Check if user changed password after the token was issued
  if (this_user.changedPasswordAfter(decoded.iat)) {
    return res.status(401).json({
      status: "error",
      message: "User recently changed password! Please log in again.",
    });
  }

  // 5) Auto-renew token if expired or near expiry (< 7 days remaining)
  const nowInSec = Math.floor(Date.now() / 1000);
  const secondsRemaining = (decoded.exp || 0) - nowInSec;
  if (isExpired || secondsRemaining < 7 * 24 * 3600) {
    const refreshedToken = signToken(this_user._id);
    res.setHeader("x-new-token", refreshedToken);
    res.setHeader("Access-Control-Expose-Headers", "x-new-token");
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = this_user;
  next();
});

exports.refreshToken = catchAsync(async (req, res, next) => {
  let token = req.body?.token;
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(400).json({
      status: "error",
      message: "Token is required for refresh",
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      ignoreExpiration: true,
    });
  } catch (err) {
    return res.status(401).json({
      status: "error",
      message: "Invalid token signature",
    });
  }

  const user = await User.findById(decoded.userId).select("+passwordChangedAt");
  if (!user) {
    return res.status(401).json({
      status: "error",
      message: "User no longer exists",
    });
  }

  if (user.changedPasswordAfter(decoded.iat)) {
    return res.status(401).json({
      status: "error",
      message: "Password was changed recently. Please log in again.",
    });
  }

  const newToken = signToken(user._id);

  res.setHeader("x-new-token", newToken);
  res.setHeader("Access-Control-Expose-Headers", "x-new-token");

  res.status(200).json({
    status: "success",
    message: "Token refreshed successfully",
    token: newToken,
    user_id: user._id,
  });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Validate and normalize email
  const email = (req.body.email || "").trim().toLowerCase();
  if (!email) {
    return res.status(400).json({
      status: "error",
      message: "Please enter your email address.",
    });
  }

  // 2) Get user based on POSTed email (with case-insensitive fallback for legacy records)
  let user = await User.findOne({ email });
  if (!user) {
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    user = await User.findOne({ email: new RegExp(`^${escapedEmail}$`, "i") });
  }
  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "There is no account registered with that email address.",
    });
  }

  // 3) Generate secure, unique, time-limited password reset token
  // Store only the SHA-256 hashed token in the database
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 4) Dynamically resolve valid Trackon app frontend reset URL
  const isProd = process.env.NODE_ENV === "production";
  const isLocalOrMobileOrigin = (urlStr) =>
    !urlStr ||
    urlStr === "null" ||
    /^(capacitor|ionic|file):\/\//i.test(urlStr) ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(urlStr);

  let frontendOrigin = (process.env.FRONTEND_URL || "").trim();
  if (isProd && isLocalOrMobileOrigin(frontendOrigin)) {
    frontendOrigin = "";
  }

  if (!frontendOrigin) {
    const reqOrigin = (req.get("origin") || "").trim();
    if (reqOrigin && (!isProd || !isLocalOrMobileOrigin(reqOrigin))) {
      frontendOrigin = reqOrigin;
    } else if (req.get("referer")) {
      try {
        const refOrigin = new URL(req.get("referer")).origin;
        if (!isProd || !isLocalOrMobileOrigin(refOrigin)) {
          frontendOrigin = refOrigin;
        }
      } catch (e) {}
    }
  }

  if (!frontendOrigin) {
    frontendOrigin = isProd
      ? "https://trackon.netlify.app"
      : "http://localhost:3000";
  }
  frontendOrigin = frontendOrigin.replace(/\/+$/, "");
  const resetURL = `${frontendOrigin}/auth/new-password?token=${resetToken}`;

  console.log("==========================================");
  console.log("🔑 PASSWORD RESET REQUEST");
  console.log("Recipient:", user.email);
  if (!isProd) console.log("Reset URL:", resetURL);
  console.log("Expires in: 10 minutes");
  console.log("==========================================");

  // 5) Dispatch professional email with reset link
  let emailSent = false;
  let mailResult = null;
  let mailError = null;

  try {
    const fromAddress =
      process.env.MAIL_FROM ||
      process.env.SMTP_FROM ||
      process.env.BREVO_FROM_EMAIL ||
      process.env.RESEND_FROM_EMAIL ||
      process.env.GMAIL_USER ||
      process.env.EMAIL_USER ||
      process.env.SENDGRID_FROM_EMAIL ||
      "Trackon Support <support@trackon.app>";

    mailResult = await mailService.sendEmail({
      from: fromAddress,
      to: user.email,
      subject: "Reset your Trackon password",
      html: resetPassword(user.firstName || "there", resetURL),
      text: `Hello ${user.firstName || "there"},\n\nWe received a request to reset your Trackon password. Visit the link below to set a new password:\n\n${resetURL}\n\nThis link is valid for 10 minutes.\n\nIf you did not make this request, you can safely ignore this email.\n\nBest regards,\nTrackon Security Team`,
    });
    emailSent = true;
  } catch (err) {
    mailError = err;
    console.error("❌ Failed to send password reset email:", err?.message || err);
  }

  // If email was sent or simulated in development
  if (emailSent) {
    return res.status(200).json({
      status: "success",
      message: "Password reset link sent to your email!",
      emailSent: true,
      ...(mailResult?.previewUrl ? { previewUrl: mailResult.previewUrl } : {}),
      ...(!isProd ? { dev_reset_url: resetURL } : {}),
    });
  }

  // If mail delivery failed:
  // In development, keep token valid so testing can proceed with console link
  if (!isProd) {
    return res.status(200).json({
      status: "success",
      message: "Password reset link generated! (Check console for reset link)",
      emailSent: false,
      dev_reset_url: resetURL,
      token: resetToken,
    });
  }

  // In production, invalidate token if email completely failed
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save({ validateBeforeSave: false });

  return res.status(503).json({
    status: "error",
    message:
      mailError?.message ||
      "There was an error sending the reset email. Please try again later or contact support.",
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Validate token
  const token = req.body.token ? String(req.body.token).trim() : "";
  if (!token) {
    return res.status(400).json({
      status: "error",
      message: "Reset token is missing or invalid. Please request a new password reset link.",
    });
  }

  // 2) Get user based on the hashed token
  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select("+passwordResetToken +passwordResetExpires");

  // 3) If token has expired or invalid
  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "Password reset token is invalid or has expired. Please request a new link.",
    });
  }

  // 4) Validate new password
  const { password, passwordConfirm } = req.body;
  if (!password || typeof password !== "string") {
    return res.status(400).json({
      status: "error",
      message: "Password is required",
    });
  }

  if (passwordConfirm && password !== passwordConfirm) {
    return res.status(400).json({
      status: "error",
      message: "Passwords do not match.",
    });
  }

  const isStrongReset =
    password.length >= 8 &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^a-zA-Z0-9]/.test(password);

  if (!isStrongReset) {
    return res.status(400).json({
      status: "error",
      message:
        "Password must be strong. It must be at least 8 characters long and include numbers, letters, and special characters (!@#$%...).",
    });
  }

  // 5) Save new password (pre-save hook hashes with bcrypt)
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 6) Sign new JWT token and log user in
  const authToken = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Password Reset Successfully",
    token: authToken,
    user_id: user._id,
  });
});

exports.getMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    data: req.user,
  });
});
