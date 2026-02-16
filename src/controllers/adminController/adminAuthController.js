const Admin = require("../../models/adminModel");
const bcrypt = require("../../utils/bcrypt");
const Otp = require("../../models/otpModel");
const { generateOTP } = require("../../utils/generateOTP");
const { generateToken } = require("../../utils/jwt");
const { sendEmail } = require("../../utils/email");

exports.adminRegister = async (req, res) => {
  try {
    const { name, userName, phone, email, password } = req.body;

    if (!name || !userName || !phone || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const admin = await Admin.findOne({ email });
    if (admin) {
      return res
        .status(400)
        .json({ success: false, message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hashPassword(password);
    const newAdmin = new Admin({
      name,
      userName,
      phone,
      email,
      password: hashedPassword,
    });

    await newAdmin.save();
    return res
      .status(201)
      .json({ success: true, message: "Admin registered successfully" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.superAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid Credentials" });
    }

    const isPasswordValid = await bcrypt.comparePassword(
      password,
      admin.password,
    );
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid Credentials" });
    }

    const newOtp = await generateOTP();

    const otp = new Otp({
      userId: admin._id,
      otp: newOtp,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000), // OTP valid for 2 minutes
    });

    await otp.save();

    await sendEmail(
      admin.email,
      [],
      [],
      "Your OTP for Super Admin Login",
      `Your OTP is: ${newOtp}. It is valid for 2 minutes.`,
    );

    res.status(200).json({
      success: true,
      message: "OTP sent to your email successfully",
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.verifySuperAdminOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }

    const savedOtp = await Otp.findOne({
      userId: admin._id,
      isUsed: false,
    }).sort({
      createdAt: -1,
    });

    if (!savedOtp) {
      return res.status(404).json({ success: false, message: "OTP not found" });
    }

    if (savedOtp.otp !== otp) {
      return res.status(401).json({ success: false, message: "Invalid OTP" });
    }

    if (savedOtp.expiresAt < new Date()) {
      return res
        .status(401)
        .json({ success: false, message: "OTP has expired" });
    }

    const token = generateToken({ id: admin._id, role: "admin" });

    savedOtp.isUsed = true;
    await savedOtp.save();

    await Otp.deleteMany({ userId: admin._id });

    res.status(200).json({
      success: true,
      message: "Admin logged in successfully",
      admin,
      token,
    });
    
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};
