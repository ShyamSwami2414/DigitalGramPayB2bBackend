const crypto = require("crypto");

let counter = 0;

exports.generateUniqueRefernceId = (prefix = "TXN") => {
  const cleanPrefix = prefix
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, "X");

  // 6 chars time
  const time = Date.now().toString(36).toUpperCase().slice(-6);

  // 3 digit counter
  counter = (counter + 1) % 1000;
  const counterPart = counter.toString().padStart(3, "0");

  // 8 chars random
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();

  // TOTAL = 3 + 6 + 3 + 8 = 20
  return `${cleanPrefix}${time}${counterPart}${random}`;
};
