const mongoose = require("mongoose");
const Counter = require("./counterModel");

const supportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    ticketId: {
      type: String,
      unique: true,
      index: true,
    },

    transactionId: {
      type: String,
      index: true,
    },

    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },

    supportDetails: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "resolved", "closed"],
      default: "pending",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Auto Generate Ticket ID
supportSchema.pre("save", async function (next) {
  try {
    if (!this.ticketId) {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "supportTicket" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      );

      this.ticketId = `TKT${counter.seq.toString().padStart(5, "0")}`;
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("Support", supportSchema);
