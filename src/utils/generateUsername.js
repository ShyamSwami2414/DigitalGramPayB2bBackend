const User = require("../models/userModel");
const Counter = require("../models/counterModel");

const getRolePrefix = (role) => {
  if (!role) return "U";

  const roleMap = {
    "STATE HEAD": "SH",
    "MASTER DISTRIBUTOR": "MD",
    DISTRIBUTOR: "DT",
    RETAILER: "RT",
  };

  return roleMap[role.trim().toUpperCase()] || "U";
};

exports.generateUsername = async ({ role }) => {
  const prefix = "CAM" + getRolePrefix(role);

  let userName;
  let exists = true;

  while (exists) {
    // random 6 digit number
    const randomNumber = Math.floor(10000 + Math.random() * 90000);

    userName = `${prefix}${randomNumber}`;

    exists = await User.exists({
      userName,
    });
  }

  return userName;
};
