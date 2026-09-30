const router = require("express").Router();
const authController = require("../controllers/auth");
const statusController = require("../controllers/status");

// All status routes require authentication
router.post("/create", authController.protect, statusController.createStatus);
router.get("/all", authController.protect, statusController.getAllStatuses);
router.post("/view/:id", authController.protect, statusController.viewStatus);
router.delete("/:id", authController.protect, statusController.deleteStatus);

module.exports = router;
