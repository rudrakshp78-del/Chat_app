const mongoose = require("mongoose");
const User = require("../models/user");
const FriendRequest = require("../models/friendRequest");
const AudioCall = require("../models/audioCall");
const VideoCall = require("../models/videoCall");
const OneToOneMessage = require("../models/OneToOneMessage");
const filterObj = require("../utils/filterObj");
const { generateToken04 } = require("./zegoServerAssistant");

exports.updateMe = async (req, res, next) => {
  try {
    const { user } = req;

    const filteredBody = filterObj(
      req.body,
      "firstName",
      "lastName",
      "about",
      "avatar",
      "links",
    );

    const updated_user = await User.findByIdAndUpdate(user._id, filteredBody, {
      new: true,
      validateModifiedOnly: true,
    });

    res.status(200).json({
      status: "success",
      data: updated_user,
      message: "Profile Updated successfully!",
    });
  } catch (err) {
    console.error("updateMe error:", err);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

const inFlightConversationFetches = new Map();

const fetchDirectConversationsForUser = async (currentUserId) => {
  if (!currentUserId || !mongoose.Types.ObjectId.isValid(currentUserId)) {
    return [];
  }

  const uidStr = currentUserId.toString();
  if (inFlightConversationFetches.has(uidStr)) {
    return inFlightConversationFetches.get(uidStr);
  }

  const promise = (async () => {
    const existing_conversations = await OneToOneMessage.find({
      participants: { $all: [uidStr] },
    })
      .select("-messages.file")
      .populate(
        "participants",
        "firstName lastName _id email status avatar about links"
      )
      .lean();

    // Filter out messages that were deleted for this user
    return existing_conversations
      .map((convObj) => {
        const allMsgs = Array.isArray(convObj.messages)
          ? convObj.messages.filter((msg) => {
              if (msg.deleted_for && Array.isArray(msg.deleted_for)) {
                return !msg.deleted_for.some(
                  (uid) => (uid?._id || uid)?.toString() === uidStr
                );
              }
              return true;
            })
          : [];

        const lastMessage =
          allMsgs.length > 0 ? allMsgs[allMsgs.length - 1] : null;
        const unreadCount = allMsgs.filter(
          (m) =>
            (m.to?._id || m.to)?.toString() === uidStr &&
            !m.seen &&
            m.status !== "seen"
        ).length;

        return {
          ...convObj,
          last_message: lastMessage,
          unread_count: unreadCount,
          messages: allMsgs.slice(-15),
        };
      })
      .filter((conv) => {
        // If user deleted this chat and there are no messages left for this user, do not show in sidebar
        const isChatDeletedForUser =
          conv.deleted_for &&
          Array.isArray(conv.deleted_for) &&
          conv.deleted_for.some(
            (uid) => (uid?._id || uid)?.toString() === uidStr
          );
        if (
          isChatDeletedForUser &&
          (!conv.messages || conv.messages.length === 0)
        ) {
          return false;
        }
        return true;
      });
  })();

  inFlightConversationFetches.set(uidStr, promise);
  try {
    return await promise;
  } finally {
    inFlightConversationFetches.delete(uidStr);
  }
};

exports.fetchDirectConversationsForUser = fetchDirectConversationsForUser;

exports.getDirectConversations = async (req, res) => {
  try {
    const conversations = await fetchDirectConversationsForUser(req.user._id);
    res.status(200).json({
      status: "success",
      data: conversations,
    });
  } catch (err) {
    console.error("getDirectConversations error:", err);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const friendIds = Array.isArray(req.user.friends) ? req.user.friends : [];
    const excludeIds = [...friendIds, req.user._id];

    const remaining_users = await User.find({
      verified: true,
      _id: { $nin: excludeIds },
    })
      .select("firstName lastName _id status avatar email")
      .lean();

    res.status(200).json({
      status: "success",
      data: remaining_users,
      message: "Users found Successfully!",
    });
  } catch (err) {
    console.error("getUsers error:", err);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

exports.getAllVerifiedUsers = async (req, res, next) => {
  try {
    const users = await User.find({
      verified: true,
      _id: { $ne: req.user._id },
    })
      .select("firstName lastName _id status avatar email")
      .lean();

    res.status(200).json({
      status: "success",
      data: users,
      message: "Users found successfully",
    });
  } catch (err) {
    console.error("getAllVerifiedUsers error:", err);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

exports.getRequests = async (req, res, next) => {
  try {
    const requests = await FriendRequest.find({ recipient: req.user._id })
      .populate("sender", "_id firstName lastName status avatar")
      .lean();

    res.status(200).json({
      status: "success",
      data: requests,
      message: "Friend request Found Successfully",
    });
  } catch (err) {
    console.error("getRequests error:", err);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

exports.getfriends = async (req, res, next) => {
  try {
    const this_user = await User.findById(req.user._id)
      .select("friends")
      .populate("friends", "_id firstName lastName status avatar")
      .lean();

    res.status(200).json({
      status: "success",
      data: this_user?.friends || [],
      message: "Friends found successfully",
    });
  } catch (err) {
    console.error("getfriends error:", err);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

// ---------------- CALL CONTROLLERS ----------------

exports.startAudioCall = async (req, res, next) => {
  try {
    const from = req.user._id;
    const to = req.body.id;

    if (!to) {
      return res.status(400).json({
        status: "error",
        message: "Recipient ID is required",
      });
    }

    const from_user = await User.findById(from);
    let to_user = null;
    let targetTo = to;
    if (mongoose.Types.ObjectId.isValid(to)) {
      to_user = await User.findById(to);
      if (!to_user) {
        const conv = await OneToOneMessage.findById(to);
        if (conv && conv.participants) {
          const otherParticipant = conv.participants.find(
            (p) => p.toString() !== from.toString()
          );
          if (otherParticipant) {
            targetTo = otherParticipant;
            to_user = await User.findById(otherParticipant);
          }
        }
      }
    }

    if (!to_user) {
      return res.status(404).json({
        status: "error",
        message: "Recipient user not found",
      });
    }

    const new_audio_call = await AudioCall.create({
      participants: [from, targetTo],
      from,
      to: targetTo,
      status: "Ongoing",
    });

    const roomID = new_audio_call._id.toString();

    res.status(200).json({
      status: "success",
      data: {
        call_id: new_audio_call._id,
        roomID,
        streamID: targetTo.toString(),
        userID: from.toString(),
        userName: `${from_user?.firstName || ""} ${from_user?.lastName || ""}`.trim() || "User",
        from_user,
        to_user,
      },
    });
  } catch (err) {
    console.error("startAudioCall error:", err);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

exports.startVideoCall = async (req, res, next) => {
  try {
    const from = req.user._id;
    const to = req.body.id;

    if (!to) {
      return res.status(400).json({
        status: "error",
        message: "Recipient ID is required",
      });
    }

    const from_user = await User.findById(from);
    let to_user = null;
    let targetTo = to;
    if (mongoose.Types.ObjectId.isValid(to)) {
      to_user = await User.findById(to);
      if (!to_user) {
        const conv = await OneToOneMessage.findById(to);
        if (conv && conv.participants) {
          const otherParticipant = conv.participants.find(
            (p) => p.toString() !== from.toString()
          );
          if (otherParticipant) {
            targetTo = otherParticipant;
            to_user = await User.findById(otherParticipant);
          }
        }
      }
    }

    if (!to_user) {
      return res.status(404).json({
        status: "error",
        message: "Recipient user not found",
      });
    }

    const new_video_call = await VideoCall.create({
      participants: [from, targetTo],
      from,
      to: targetTo,
      status: "Ongoing",
    });

    const roomID = new_video_call._id.toString();

    res.status(200).json({
      status: "success",
      data: {
        call_id: new_video_call._id,
        roomID,
        streamID: targetTo.toString(),
        userID: from.toString(),
        userName: `${from_user?.firstName || ""} ${from_user?.lastName || ""}`.trim() || "User",
        from_user,
        to_user,
      },
    });
  } catch (err) {
    console.error("startVideoCall error:", err);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

exports.generateZegoToken = async (req, res, next) => {
  try {
    const { userId, room_id } = req.body;
    const appId = parseInt(process.env.ZEGO_APP_ID || 1073252628);
    const serverSecret = process.env.ZEGO_SERVER_SECRET || "bc4bc57bc997d9d2d74d9ebcdd00f5f9";
    const effectiveTimeInSeconds = 3600;
    const payload = "";

    // SECURITY: Only the authenticated user can generate their own call token
    const userIdentifier = req.user._id.toString();

    const token = generateToken04(
      appId,
      userIdentifier,
      serverSecret,
      effectiveTimeInSeconds,
      payload
    );

    res.status(200).json({
      status: "success",
      token,
    });
  } catch (err) {
    console.error("generateZegoToken error:", err);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

exports.getCallLogs = async (req, res, next) => {
  try {
    const user_id = req.user._id;

    const audio_calls = await AudioCall.find({
      participants: { $all: [user_id] },
    }).populate("from to", "firstName lastName avatar status");

    const video_calls = await VideoCall.find({
      participants: { $all: [user_id] },
    }).populate("from to", "firstName lastName avatar status");

    const call_logs = [...audio_calls, ...video_calls].sort(
      (a, b) => new Date(b.startedAt) - new Date(a.startedAt)
    );

    res.status(200).json({
      status: "success",
      data: call_logs,
    });
  } catch (err) {
    console.error("getCallLogs error:", err);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};
