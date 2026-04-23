const crypto = require("crypto");

const publicKeyPEM = process.env.EKO_AADHAR_ENCRYPTION_PUBLIC_KEY;

// Convert to proper PEM format
const publicKey = `-----BEGIN PUBLIC KEY-----
${publicKeyPEM}
-----END PUBLIC KEY-----`;

exports.encryptEkoAadhar = (aadhaarNumber) => {
  try {
    // Encrypt using RSA/ECB/PKCS1Padding
    const encryptedBuffer = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(aadhaarNumber, "utf8"),
    );

    const encryptedAadhar = encryptedBuffer.toString("base64");

    console.log("Encrypted Aadhar:", encryptedAadhar);
    return encryptedAadhar;
  } catch (error) {
    console.error(error);
  }
};
