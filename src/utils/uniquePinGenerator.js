const crypto = require("crypto");

exports.generateUniquePin = () => {
    const pin = crypto.randomInt(100000, 999999);
    console.log(pin, "pin");
    return pin;
}
