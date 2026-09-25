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
const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);

// Register New User

exports.register = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  const filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "email",
    "password",
  );

  // check if a verified user with given email exists

  const existing_user = await User.findOne({ email: email });

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
    existing_user.email = filteredBody.email;
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
  console.log("OTP:", new_otp);
  console.log("OTP recipient:", user.email);
  console.log("OTP expiry:", user.otp_expiry_time);
  console.log("OTP expiry date:", new Date(user.otp_expiry_time));
  console.log("Current date:", new Date());
  console.log("==============================");

  await mailService.sendEmail({
    from: process.env.SENDGRID_FROM_EMAIL,
    to: user.email,
    subject: "Verification OTP",
    html: otp(user.firstName, new_otp),
    attachments: [],
  });

  res.status(200).json({
    status: "success",
    message: "OTP Sent Successfully!",
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

  const user = await User.findOne({ email });

  if (!user) {
    console.log("❌ User not found");

    return res.status(400).json({
      status: "error",
      message: "Email is invalid",
    });
  }

  console.log("✅ User found");
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
    console.log("❌ OTP expired");

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
    return res.status(400).json({
      status: "error",
      message: "OTP is incorrect",
    });
  }

  user.verified = true;
  user.otp = undefined;
  user.otp_expiry_time = undefined;

  await user.save();

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

  const user = await User.findOne({ email: email }).select("+password");

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

// Protect
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
      message: "You are not logged in! Please log in to get access.",
    });
  }
  // 2) Verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  console.log(decoded);

  // 3) Check if user still exists

  const this_user = await User.findById(decoded.userId);
  if (!this_user) {
    return res.status(401).json({
      message: "The user belonging to this token does no longer exists.",
    });
  }
  // 4) Check if user changed password after the token was issued
  if (this_user.changedPasswordAfter(decoded.iat)) {
    return res.status(401).json({
      message: "User recently changed password! Please log in again.",
    });
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = this_user;
  next();
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "There is no user with email address.",
    });
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    const resetURL = `http://localhost:3000/auth/new-password?token=${resetToken}`;
    // TODO => Send Email with this Reset URL to user's email address

    console.log(resetURL);

    await mailService.sendEmail({
      from: process.env.SENDGRID_FROM_EMAIL,
      to: user.email,
      subject: "Reset Password",
      html: resetPassword(user.firstName, resetURL),
      attachments: [],
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(500).json({
      message: "There was an error sending the email. Try again later!",
    });
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.body.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "Token is Invalid or Expired",
    });
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Password Reseted Successfully",
    token,
  });
});

exports.getMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    data: req.user,
  });
});
