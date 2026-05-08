const Admin = require("../../models/adminModel");
const bcrypt = require("../../utils/bcrypt");
const Otp = require("../../models/otpModel");
const mongoose = require("mongoose");
const { generateOTP } = require("../../utils/generateOTP");
const { generateToken } = require("../../utils/jwt");
const { sendEmail } = require("../../utils/email");

exports.adminRegister = async (req, res, next) => {
  try {
    const { name, userName, phone, email, password, permissionIds } = req.body;

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
      permissionIds: permissionIds,
      password: hashedPassword,
    });

    await newAdmin.save();
    return res.status(201).json({
      success: true,
      message: "Admin registered successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.superAdminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    const admin = await Admin.findOne({ email, isDeleted: false });
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
        .status(400)
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
    next(error);
  }
};

exports.verifySuperAdminOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required" });
    }

    const admin = await Admin.findOne({ email, isDeleted: false });
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
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (savedOtp.expiresAt < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "OTP has expired" });
    }

    const token = generateToken({
      id: admin?._id,
      role: "admin",
      type: admin?.type,
      permissionIds: admin?.permissionIds,
    });

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
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const adminId = req.user.id;

    const admin = await Admin.findOne({
      _id: new mongoose.Types.ObjectId(adminId),
      isDeleted: false,
    });
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from old password",
      });
    }
    const isOldPasswordValid = await bcrypt.comparePassword(
      currentPassword,
      admin.password,
    );
    if (!isOldPasswordValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Old Password" });
    }

    const hashedPassword = await bcrypt.hashPassword(newPassword);
    admin.password = hashedPassword;

    await admin.save();
    return res.status(201).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const adminId = req.user.id;

    const admin = await Admin.findOne({
      _id: new mongoose.Types.ObjectId(adminId),
      isDeleted: false,
    });
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }

    const { name, phone, email, bio } = req.body;
    if (!name || !phone || !email) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }
    admin.name = name;
    admin.email = email;
    admin.phone = phone;
    admin.bio = bio || "";

    await admin.save();
    return res.status(201).json({
      success: true,
      message: "Profile Updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.fetchProfile = async (req, res, next) => {
  try {
    const adminId = req.user.id;

    console.log(adminId, "adminId");

    const result = await Admin.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(adminId),
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: "permissions",
          let: { permissionIds: "$permissionIds" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$permissionIds"],
                },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
              },
            },
          ],
          as: "permissions",
        },
      },
      {
        $project: {
          password: 0,
        },
      },
    ]);

    console.log(result, "result");

    if (!result || result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: result[0],
    });
  } catch (error) {
    next(error);
  }
};
