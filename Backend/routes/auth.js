const express = require("express");
const router = express.Router();

const {
  register,
  sendOTP,
  resendOTP,
  verifyOTP,
  login,
  protect,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth");

router.post("/register", register, sendOTP);
router.post("/send-otp", sendOTP);
router.post("/resend-otp", resendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/verify", verifyOTP);
router.post("/login", login);


router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.patch("/reset-password", resetPassword);

module.exports = router;
