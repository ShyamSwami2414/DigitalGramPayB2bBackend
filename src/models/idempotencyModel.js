const mongoose = require("mongoose");

const idempotencySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      unique: true, // one key can exist only once
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },

    response: mongoose.Schema.Types.Mixed, // store API response
    responseCode: Number,

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // auto expire after 24h
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

idempotencySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Idempotency", idempotencySchema);
