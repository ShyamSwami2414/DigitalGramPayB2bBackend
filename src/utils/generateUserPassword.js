const crypto = require("crypto");

exports.generateUserPassword = () => {
  const min = 1000000;
  const max = 9999999;

  const password = crypto.randomInt(min, max + 1).toString();
  console.log(password, "password");
  return password;
  // return 123456789;
};
