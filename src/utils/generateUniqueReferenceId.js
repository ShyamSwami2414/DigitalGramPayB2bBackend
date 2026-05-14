const { nanoid } = require("nanoid");

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 8);

exports.generateUniqueRefernceId = (prefix = "TXN") => {
  const cleanPrefix = prefix
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 3) // max 3 chars
    .padEnd(3, "X"); // ensure 3 chars

  const timestamp = Date.now().toString().slice(-9);

  return `${cleanPrefix}${timestamp}${nanoid()}`;
};
