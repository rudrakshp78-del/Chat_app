const mongoose = require("mongoose");

const oneToOneMessageSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  ],
  messages: [
    {
      to: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      from: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      type: {
        type: String,
        enum: ["Text", "Media", "Document", "Link", "Reply"],
      },
      created_at: {
        type: Date,
        default: Date.now,
      },
      text: {
        type: String,
      },
      file: {
        type: String,
      },
      reply: {
        type: String,
      },
      starred: {
        type: Boolean,
        default: false,
      },
      reaction: {
        type: String,
        default: "",
      },
      deleted: {
        type: Boolean,
        default: false,
      },
      deleted_for: [
        {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
      ],
      status: {
        type: String,
        enum: ["sent", "delivered", "seen"],
        default: "sent",
      },
      seen: {
        type: Boolean,
        default: false,
      },
      seen_at: {
        type: Date,
      },
    },
  ],
  deleted_for: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  ],
});

const OneToOneMessage = mongoose.model(
  "OneToOneMessage",
  oneToOneMessageSchema
);
module.exports = OneToOneMessage;