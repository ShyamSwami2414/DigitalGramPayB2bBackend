const { customAlphabet } = require("nanoid");

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 10);

exports.generateUniqueRefernceId = (prefix = "TXN") => {
  const cleanPrefix = prefix.replace(/[^A-Z0-9]/gi, "").toUpperCase();

  return `${cleanPrefix}${Date.now()}${nanoid()}`;
};
