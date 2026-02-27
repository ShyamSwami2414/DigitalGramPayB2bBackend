const Admin = require("../models/adminModel");

exports.generateAdminUsername = async () => {
    const lastUser = await Admin.findOne({ userName: { $regex: /^ADMIN/ } })
        .sort({ createdAt: -1 });

    let newNumber = 1;

    if (lastUser) {
        const lastNumber = parseInt(lastUser.userName.replace("ADMIN", ""));
        newNumber = lastNumber + 1;
    }

    const userName = `ADMIN${String(newNumber).padStart(3, "0")}`;

    console.log(userName);

    return userName;
};
