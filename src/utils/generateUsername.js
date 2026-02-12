const User = require("../models/userModel");

exports.generateUsername = async () => {
    const lastUser = await User.findOne({ userName: { $regex: /^UCAM/ } })
        .sort({ createdAt: -1 });

    let newNumber = 1;

    if (lastUser) {
        const lastNumber = parseInt(lastUser.userName.replace("UCAM", ""));
        newNumber = lastNumber + 1;
    }

    const userName = `UCAM${String(newNumber).padStart(5, "0")}`;

    console.log(userName);

    return userName;
};
