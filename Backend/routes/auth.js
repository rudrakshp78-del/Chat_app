const express = require("express");
const router = express.Router();

const {
  register,
  sendOTP,
  verifyOTP,
  login,
  protect,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth");

router.post("/register", register, sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);


router.post("/forgot-password", forgotPassword);
router.patch("/reset-password", resetPassword);

module.exports = router;
