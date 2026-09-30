const mongoose = require("mongoose");

const statusSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Status must have an author"],
    },
    // Type of status: "text" or "image"
    type: {
      type: String,
      enum: ["text", "image"],
      default: "text",
    },
    // Text message or caption for media
    content: {
      type: String,
      trim: true,
      default: "",
    },
    // Media URL or base64 data string
    media: {
      type: String,
      default: "",
    },
    // Background color or gradient for text statuses
    background: {
      type: String,
      default: "#00a884",
    },
    // Font style for text statuses
    fontFamily: {
      type: String,
      default: "sans-serif",
    },
    // List of users who have viewed this status
    viewers: [
      {
        user: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Status expiration: exactly 24 hours from creation (WhatsApp standard)
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: { expires: "1s" }, // MongoDB TTL index to auto-delete expired documents
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index to quickly fetch active unexpired statuses
statusSchema.index({ expiresAt: 1, createdAt: -1 });

const Status = mongoose.model("Status", statusSchema);

module.exports = Status;
