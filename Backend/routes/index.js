const router = require("express").Router();

const authRoute = require("./auth");
const userRoute = require("./user");
const statusRoute = require("./status");

router.use("/auth", authRoute);
router.use("/user", userRoute);
router.use("/status", statusRoute);

module.exports = router;