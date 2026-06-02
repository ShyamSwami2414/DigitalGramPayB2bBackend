const Admin = require("../../models/adminModel");
const bcrypt = require("../../utils/bcrypt");
const Otp = require("../../models/otpModel");
const mongoose = require("mongoose");
const { generateOTP } = require("../../utils/generateOTP");
const { generateToken } = require("../../utils/jwt");
const { sendEmail } = require("../../utils/email");
const {
  generateOtpEmail,
} = require("../../templates/emailTemplates/otpEmailTemplate");
const crypto = require("crypto");

exports.adminRegister = async (req, res, next) => {
  try {
    let { name, userName, phone, email, password, permissionIds } = req.body;
    name = name?.trim();
    userName = userName?.trim()?.toUpperCase();
    phone = phone?.trim();
    email = email?.trim()?.toLowerCase();
    password = password?.trim();

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
      permissionIds: permissionIds,
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

    const html = generateOtpEmail({
      name: admin?.name,
      otp: newOtp,
    });

    await sendEmail(
      admin.email,
      [],
      [],
      "Your OTP for Super Admin Login",
      html,
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

exports.forgotPassword = async (req, res, next) => {
  try {
    let { email } = req.body;
    email = email?.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const admin = await Admin.findOne({
      email: email,
      isActive: true,
      isDeleted: false,
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Delete old OTPs
    await Otp.deleteMany({
      userId: admin._id,
      purpose: "FORGOT_PASSWORD",
    });

    const generatedOtp = generateOTP();

    await Otp.create({
      userId: admin._id,
      otp: generatedOtp,
      purpose: "FORGOT_PASSWORD",
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
    });

    const html = generateOtpEmail({
      name: `${admin.name}`,
      otp: generatedOtp,
      reason: "Password Reset",
    });

    await sendEmail(admin.email, [], [], "Reset Password OTP", html);

    return res.status(200).json({
      success: true,
      message: "OTP has been sent successfully on your registered email",
    });
  } catch (error) {
    next(error);
  }
};

//forgot-password flow
exports.verifyResetPasswordOtp = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    let { email, otp } = req.body;
    otp = otp?.trim();

    console.log(otp, "otp");

    if (!email || !otp) {
      const err = new Error("Email and OTP are required");
      err.statusCode = 400;
      throw err;
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      const err = new Error("Admin not found");
      err.statusCode = 404;
      throw err;
    }

    const savedOtp = await Otp.findOne({
      userId: admin._id,
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

    // if (savedOtp.expiresAt < new Date()) {
    //   const err = new Error("OTP has expired");
    //   err.statusCode = 400;
    //   throw err;
    // }

    savedOtp.isUsed = true;

    const resetToken = crypto.randomBytes(32).toString("hex");

    admin.passwordResetToken = resetToken;
    admin.resetPasswordExpires = Date.now() + 10 * 60 * 1000; //10 minutes

    await savedOtp.save({ session: session });
    await admin.save({ session: session });

    await Otp.deleteMany({ userId: admin._id }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "OTP Verified Successsfully",
      data: {
        resetToken: resetToken,
      },
    });
  } catch (error) {
    if (session.inTransaction) {
      await session.abortTransaction();
    }

    next(error);
  } finally {
    session.endSession();
  }
};

//forgot-password flow
exports.resetPassword = async (req, res, next) => {
  try {
    let { resetToken, newPassword, confirmPassword } = req.body;
    newPassword = newPassword?.trim();
    confirmPassword = confirmPassword?.trim();

    // Required field validation
    const requiredFields = ["resetToken", "newPassword", "confirmPassword"];

    const missingFields = [];

    requiredFields.forEach((field) => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Match passwords
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // Password strength validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,20}$/;

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be 8-20 characters and include uppercase, lowercase, number, and special character",
      });
    }

    // Find admin using reset token
    const admin = await Admin.findOne({
      passwordResetToken: resetToken,

      resetPasswordExpires: {
        $gt: Date.now(),
      },

      isDeleted: false,
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Prevent same password reuse
    const isSamePassword = await bcrypt.comparePassword(
      newPassword,
      admin.password,
    );

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from old password",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hashPassword(newPassword);

    admin.password = hashedPassword;
    // Clear reset token
    admin.passwordResetToken = null;
    admin.resetPasswordExpires = null;

    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};
