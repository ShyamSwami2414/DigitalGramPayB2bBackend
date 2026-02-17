const UAParser = require("ua-parser-js");
const User = require("../../models/userModel");
const Role = require("../../models/roleModel");
const bcrypt = require("../../utils/bcrypt");
const { generateToken } = require("../../utils/jwt");
const { generateUniquePin } = require("../../utils/uniquePinGenerator");
const { generateUsername } = require("../../utils/generateUsername");
const { generateUserPassword } = require("../../utils/generateUserPassword");
const {
  generateWelcomeEmail,
} = require("../../templates/emailTemplates/welcomeEmail");
const mongoose = require("mongoose");
const { sendEmail } = require("../../utils/email");
const loginLogs = require("../../models/loginLogs");

exports.userRegister = async (req, res) => {
  try {
    const { firstName, lastName, phone, role, email } = req.body;

    if (!firstName || !lastName || !phone || !role || !email) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(role)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid role ID" });
    }

    const user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const isRoleValid = await Role.findOne({
      _id: role,
      isActive: true,
      isDeleted: false,
    });

    if (!isRoleValid) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    const pin = generateUniquePin();
    const userName = await generateUsername();
    const password = await generateUserPassword();

    const hashedPassword = await bcrypt.hashPassword(password);

    const newUser = new User({
      firstName,
      lastName,
      userName: userName,
      phone,
      roleId: role,
      email,
      pin: pin,
      password: hashedPassword,
      level: isRoleValid.level
    });

    const html = generateWelcomeEmail({
      name: firstName + " " + lastName,
      email,
      userName: userName,
      password,
      pin,
      loginUrl: "http://localhost:8000/user-login",
    });

    sendEmail(email, [], [], "Welcome to Camlenio Software", html);

    await newUser.save();
    return res
      .status(201)
      .json({ success: true, message: "User registered successfully" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.userLogin = async (req, res) => {
  try {
    const { email, password, systemDetails } = req.body;

    const parser = new UAParser(req.headers["user-agent"]);
    const ua = parser.getResult();
    console.log(ua, "ua");
    console.log(systemDetails?.location?.longitude, "longitude");
    console.log(systemDetails?.location?.latitude, "latitude");
    console.log(systemDetails?.ip, "Ip");

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    const log = new loginLogs({
      userId: user?._id || null,
      email: email,
      ipAddress: systemDetails?.ip,
      longitude: systemDetails?.location?.longitude,
      latitude: systemDetails?.location?.latitude,
      device: ua?.device,
      browser: ua?.browser,
      os: ua?.os,
      loginTime: Date.now(),
    });

    await log.save();

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid Credentials" });
    }

    const isPasswordValid = await bcrypt.comparePassword(
      password,
      user.password,
    );
    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Credentials" });
    }

    const token = generateToken({
      id: user._id,
      level: user.level,
      parentUserId: user.parentUserId || null,
      roleId: user.roleId,
    });

    log.isLoginSuccess = true;
    await log.save();

    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      user,
      token,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};
