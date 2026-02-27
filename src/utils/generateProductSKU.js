const crypto = require("crypto");

exports.generateSKU = (category) => {
    const prefixMap = {
        hardware: "HW",
        software: "SW",
        accessories: "AC",
    };

    const prefix = prefixMap[category] || "PR";

    const randomPart = crypto
        .randomBytes(3)
        .toString("hex")
        .toUpperCase(); // 6 chars

    return `${prefix}-${randomPart}`;
}

