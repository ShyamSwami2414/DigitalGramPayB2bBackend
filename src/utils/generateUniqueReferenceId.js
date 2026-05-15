const crypto = require("crypto");

let counter = 0;

exports.generateUniqueRefernceId = (prefix = "TXN") => {
  const cleanPrefix = prefix
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, "X");

  const time = Date.now().toString(36).toUpperCase();

  const random = crypto.randomBytes(5).toString("hex").toUpperCase();

  counter = (counter + 1) % 10000;

  const counterPart = counter.toString().padStart(4, "0");

  return `${cleanPrefix}${time}${counterPart}${random}`;
};
