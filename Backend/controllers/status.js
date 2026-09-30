const Status = require("../models/status");
const catchAsync = require("../utils/catchAsync");

// Create / Post a new status
exports.createStatus = catchAsync(async (req, res, next) => {
  const { type = "text", content, media, background, fontFamily } = req.body;

  if (type === "text" && (!content || !content.trim())) {
    return res.status(400).json({
      status: "error",
      message: "Status text cannot be empty",
    });
  }

  if (type === "image" && !media) {
    return res.status(400).json({
      status: "error",
      message: "Please select an image for your status",
    });
  }

  const newStatus = await Status.create({
    author: req.user._id,
    type: type || "text",
    content: content ? content.trim() : "",
    media: media || "",
    background: background || "#00a884",
    fontFamily: fontFamily || "sans-serif",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });

  await newStatus.populate("author", "_id firstName lastName avatar status");

  // Broadcast to all connected clients in real-time
  const io = req.app.get("io");
  if (io) {
    io.emit("new_status", newStatus);
  }

  return res.status(201).json({
    status: "success",
    data: newStatus,
    message: "Status posted successfully!",
  });
});

// Get all active statuses (last 24 hours) grouped by user
exports.getAllStatuses = catchAsync(async (req, res, next) => {
  const currentUserId = req.user._id.toString();

  // Find all unexpired statuses
  const allStatuses = await Status.find({
    expiresAt: { $gt: new Date() },
  })
    .populate("author", "_id firstName lastName avatar status")
    .populate("viewers.user", "_id firstName lastName avatar")
    .sort({ createdAt: 1 });

  // Separate current user's statuses
  const myStatuses = allStatuses.filter(
    (s) => s.author && s.author._id.toString() === currentUserId
  );

  // Group other users' statuses by author
  const otherUsersMap = new Map();

  allStatuses
    .filter((s) => s.author && s.author._id.toString() !== currentUserId)
    .forEach((statusItem) => {
      const authorId = statusItem.author._id.toString();

      if (!otherUsersMap.has(authorId)) {
        otherUsersMap.set(authorId, {
          user: statusItem.author,
          statuses: [],
          latestStatusAt: statusItem.createdAt,
          allViewed: true,
        });
      }

      const group = otherUsersMap.get(authorId);
      group.statuses.push(statusItem);

      // Check if current user has viewed this status
      const hasViewedThis = statusItem.viewers.some(
        (v) => v.user && v.user._id.toString() === currentUserId
      );

      if (!hasViewedThis) {
        group.allViewed = false;
      }

      if (new Date(statusItem.createdAt) > new Date(group.latestStatusAt)) {
        group.latestStatusAt = statusItem.createdAt;
      }
    });

  // Convert map to array and sort:
  // 1) Unviewed statuses first (WhatsApp "Recent updates")
  // 2) Viewed statuses after (WhatsApp "Viewed updates")
  // 3) Within each category, sorted by latest update descending
  const otherStatuses = Array.from(otherUsersMap.values()).sort((a, b) => {
    if (a.allViewed !== b.allViewed) {
      return a.allViewed ? 1 : -1;
    }
    return new Date(b.latestStatusAt) - new Date(a.latestStatusAt);
  });

  return res.status(200).json({
    status: "success",
    data: {
      myStatuses,
      otherStatuses,
    },
  });
});

// Mark a status as viewed by the current user
exports.viewStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const currentUserId = req.user._id;

  const statusDoc = await Status.findById(id);

  if (!statusDoc) {
    return res.status(404).json({
      status: "error",
      message: "Status not found or has expired",
    });
  }

  // Do not record author viewing their own status as a viewer
  if (statusDoc.author.toString() === currentUserId.toString()) {
    return res.status(200).json({
      status: "success",
      message: "Own status viewed",
    });
  }

  const alreadyViewed = statusDoc.viewers.some(
    (v) => v.user && v.user.toString() === currentUserId.toString()
  );

  if (!alreadyViewed) {
    statusDoc.viewers.push({
      user: currentUserId,
      viewedAt: new Date(),
    });

    await statusDoc.save({ validateModifiedOnly: true });

    const io = req.app.get("io");
    if (io) {
      io.emit("status_viewed", {
        statusId: statusDoc._id,
        viewer: {
          _id: req.user._id,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          avatar: req.user.avatar,
        },
        authorId: statusDoc.author,
      });
    }
  }

  return res.status(200).json({
    status: "success",
    message: "Status marked as viewed",
  });
});

// Delete a status (author only)
exports.deleteStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const currentUserId = req.user._id.toString();

  const statusDoc = await Status.findById(id);

  if (!statusDoc) {
    return res.status(404).json({
      status: "error",
      message: "Status not found",
    });
  }

  if (statusDoc.author.toString() !== currentUserId) {
    return res.status(403).json({
      status: "error",
      message: "You are not authorized to delete this status",
    });
  }

  await Status.findByIdAndDelete(id);

  const io = req.app.get("io");
  if (io) {
    io.emit("status_deleted", {
      statusId: id,
      authorId: currentUserId,
    });
  }

  return res.status(200).json({
    status: "success",
    message: "Status deleted successfully",
  });
});
