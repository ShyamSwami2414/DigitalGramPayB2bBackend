const { nanoid } = require("nanoid");

exports.generateUniqueRefernceId = () => {
  return `REF-${nanoid(10)}`;
};
