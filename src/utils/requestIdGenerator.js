const { v4: uuidv4 } = require("uuid");

exports.generateRequestId = () => {
  const uuid = uuidv4();
  console.log(uuid, "uuidv4");

  return uuid;
};
