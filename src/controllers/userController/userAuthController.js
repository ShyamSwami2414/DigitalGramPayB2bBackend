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
const Setting = require("../../models/settingModel");
const UserRequest = require("../../models/userRequestModel");
const { generateOTP } = require("../../utils/generateOTP");
const Otp = require("../../models/otpModel");

exports.userRegister = async (req, res, next) => {
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

    const setting = await Setting.findOne()

    if (!setting) {
      return res
        .status(404)
        .json({ success: false, message: "Setting not found" });
    }

    if (setting.requireAdminApprovalForCredentials) {
      const userRequest = new UserRequest({
        firstName,
        lastName,
        email,
        phone,
        roleId: role,
      })

      await userRequest.save();
      return res
        .status(201)
        .json({ success: true, message: "User request sent successfully" });
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
    next(error);
  }
};

exports.userLogin = async (req, res, next) => {
  try {
    const { email, password, userName, systemDetails } = req.body;

    const parser = new UAParser(req.headers["user-agent"]);
    const ua = parser.getResult();
    console.log(ua, "ua");
    console.log(systemDetails?.location?.longitude, "longitude");
    console.log(systemDetails?.location?.latitude, "latitude");
    console.log(systemDetails?.ip, "Ip");

    if (!email || !password || !userName) {
      return res
        .status(400)
        .json({ success: false, message: "All Details are required" });
    }

    const user = await User.findOne({ email, userName });

    const log = new loginLogs({
      userId: user?._id || null,
      email: email,
      ipAddress: systemDetails?.ip,
      longitude: systemDetails?.location?.longitude,
      latitude: systemDetails?.location?.latitude,
      device: ua?.device,
      browser: ua?.browser,
      os: ua?.os,
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

    await log.save();

    const newOtp = await generateOTP();

    const otp = new Otp({
      userId: user._id,
      otp: newOtp,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
    });

    await otp.save();

    await sendEmail(
      user.email,
      [],
      [],
      "Your OTP for User Login",
      `Your OTP is: ${newOtp}. It is valid for 2 minutes.`,
    );

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyUserOtp = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { email, otp } = req.body;
    if (!email || !otp) {
      const err = new Error("Email and OTP are required");
      err.statusCode = 400;
      throw err;
    }

    const user = await User.findOne({ email });
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    const savedOtp = await Otp.findOne({
      userId: user._id,
      isUsed: false,
    }).sort({
      createdAt: -1,
    });

    if (!savedOtp) {
      const err = new Error("OTP not found");
      err.statusCode = 404;
      throw err;
    }

    if (savedOtp.otp !== otp) {
      const err = new Error("Invalid OTP");
      err.statusCode = 400;
      throw err;
    }

    if (savedOtp.expiresAt < new Date()) {
      const err = new Error("OTP has expired");
      err.statusCode = 400;
      throw err;
    }

    const log = await loginLogs.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(user._id),
        email: email,
      },
      {
        $set: {
          isLoginSuccess: true,
          loginTime: Date.now()
        }
      },
      {
        sort: { createdAt: -1 },
        new: true
      }
    );
    if (!log) {
      const err = new Error("Login log not found");
      err.statusCode = 404;
      throw err;
    }

    let setting;

    if (user.kycStatus === "pending") {
      setting = await Setting.findOne().session(session);
      if (!setting) {
        const err = new Error("Setting not found");
        err.statusCode = 404;
        throw err;
      }
    }

    console.log(setting, "setting")

    const token = generateToken({ id: user._id, role: user.roleId });

    savedOtp.isUsed = true;
    await savedOtp.save({ session });

    await Otp.deleteMany({ userId: user._id }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      user,
      token,
      isKycOnline: setting?.isKycOnline
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
