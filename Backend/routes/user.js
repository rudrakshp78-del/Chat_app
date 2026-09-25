const router = require("express").Router();

const authController = require("../controllers/auth");
const userController = require("../controllers/user");

router.patch(
  "/update-me",
  authController.protect,
  userController.updateMe
);

router.get(
  "/get-users",
  authController.protect,
  userController.getUsers
);

router.get(
  "/get-friends",
  authController.protect,
  userController.getfriends
);

router.get(
  "/get-requests",
  authController.protect,
  userController.getRequests
);

router.get(
  "/get-me",
  authController.protect,
  authController.getMe
);

module.exports = router;
