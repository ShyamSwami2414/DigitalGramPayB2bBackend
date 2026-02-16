const crypto = require("crypto");

exports.generateOTP = () => {
  const otp = crypto.randomInt(0, 1_000_000);
  console.log("Generated OTP:", otp);

  return String(otp).padStart(6, "0");
};
