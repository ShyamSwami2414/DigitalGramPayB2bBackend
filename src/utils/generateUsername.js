const User = require("../models/userModel");

const getRolePrefix = (role) => {
  if (!role) return "U";
  return role.trim().split(" ")[0][0].toUpperCase();
};

exports.generateUsername = async ({ role }) => {
  const prefix = getRolePrefix(role);
  const lastUser = await User.findOne({ userName: { $regex: /^UCAM/ } }).sort({
    createdAt: -1,
  });

  let newNumber = 1;

  if (lastUser) {
    const lastNumber = parseInt(lastUser.userName.replace("UCAM", ""));
    newNumber = lastNumber + 1;
  }

  const userName = `${prefix}CAM${String(newNumber).padStart(5, "0")}`;

  console.log(userName);
  return userName;
};
