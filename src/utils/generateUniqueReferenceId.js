exports.generateUniqueRefernceId = () => {
  const timestamp = Date.now(); // current time
  const random = Math.floor(100000 + Math.random() * 900000); // 6 digit random

  return `REF${timestamp}${random}`;
};
