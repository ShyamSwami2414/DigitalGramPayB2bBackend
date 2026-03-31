const User = require("../models/userModel");
const Counter = require("../models/counterModel");

const getRolePrefix = (role) => {
  if (!role) return "U"; // default prefix
  return role.trim().split(" ")[0][0].toUpperCase();
};

exports.generateUsername = async ({ role }) => {
  const prefix = getRolePrefix(role) + "CAM";

  const counter = await Counter.findOneAndUpdate(
    { _id: prefix }, //
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );

  // Build username with 5-digit padded number
  const userName = `${prefix}${String(counter.seq).padStart(5, "0")}`;

  return userName;
};
