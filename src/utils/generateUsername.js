const User = require("../models/userModel");
const Counter = require("../models/counterModel");

const getRolePrefix = (role) => {
  if (!role) return "U";

  const roleMap = {
    "STATE HEAD": "ST",
    "MASTER DISTRIBUTOR": "MD",
    DISTRIBUTOR: "DT",
    RETAILER: "RT",
  };

  return roleMap[role.trim().toUpperCase()] || "U";
};

exports.generateUsername = async ({ role }) => {
  const prefix = "CAM" + getRolePrefix(role);

  const counter = await Counter.findOneAndUpdate(
    { _id: prefix }, //
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );

  // Build username with 5-digit padded number
  const userName = `${prefix}${String(counter.seq).padStart(5, "0")}`;

  return userName;
};
