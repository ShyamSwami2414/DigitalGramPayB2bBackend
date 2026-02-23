const crypto = require("crypto");

exports.generateIdempotencyFingerprint = ({ userId, operation, amount }) => {

  const window = Math.floor(Date.now() / 15000);

  const raw = `${userId}-${operation}-${amount}-${window}`;

  return crypto.createHash("sha256").update(raw).digest("hex");
}