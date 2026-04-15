const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";

const ENCRYPTION_KEY = Buffer.from(process.env.AADHAR_SECRET_KEY, "utf8");

exports.encryptAadhaar = (aadhaarNumber) => {
  if (!aadhaarNumber) return null;
  // normalize
  aadhaarNumber = aadhaarNumber.replace(/\s/g, "");

  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(aadhaarNumber, "utf8"),
    cipher.final(),
  ]);

  // IV + encrypted → base64
  return Buffer.concat([iv, encrypted]).toString("base64");
};

exports.decryptAadhaar = (encryptedData) => {
  if (!encryptedData) return null;

  const data = Buffer.from(encryptedData, "base64");

  const iv = data.subarray(0, 16);
  const encryptedText = data.subarray(16);

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};
