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
const { paiseToRupee } = require("../../utils/money");
const config = require("../../config/client");
const {
  generateOtpEmail,
} = require("../../templates/emailTemplates/otpEmailTemplate");
const crypto = require("crypto");

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

    const user = await User.findOne({
      $or: [{ email: email }, { phone: phone }],
    }).select("email phone");

    if (user) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
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

    const setting = await Setting.findOne();

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
      });

      await userRequest.save();
      return res
        .status(201)
        .json({ success: true, message: "User request sent successfully" });
    }

    const pin = generateUniquePin();
    const userName = await generateUsername({ role: isRoleValid?.name });
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
      level: isRoleValid.level,
    });

    const html = generateWelcomeEmail({
      name: firstName + " " + lastName,
      email,
      userName: userName,
      password,
      pin,
      loginUrl: config.LOGIN_URL,
    });

    sendEmail(email, [], [], `Welcome to ${config.COMPANY}`, html);

    await newUser.save();
    return res
      .status(201)
      .json({ success: true, message: "User registered successfully" });
  } catch (error) {
    next(error);
  }
};

//login -otp
exports.verifyUserOtp = async (req, res, next) => {
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

    const user = await User.findOne({ email });
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    const role = await Role.findOne({ _id: user.roleId }).lean();

    if (!role) {
      const err = new Error("Role not assigned yet");
      err.statusCode = 404;
      err.stack = "Verify OTP";
      throw err;
    }

    const savedOtp = await Otp.findOne({
      userId: user._id,
      isUsed: false,
    }).sort({
      createdAt: -1,
    });

    // const savedOtp = { otp:123456 };

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

    const log = await loginLogs.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(user._id),
        email: email,
      },
      {
        $set: {
          isLoginSuccess: true,
          loginTime: Date.now(),
        },
      },
      {
        sort: { createdAt: -1 },
        new: true,
      },
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

    console.log(setting, "setting");

    console.log(role, "role");

    const token = generateToken({
      id: user._id,
      role: user.roleId,
      kycStatus: user.kycStatus,
      isPaymentRequired: role?.isPaymentRequired,
      onBoardCharge: role?.onBoardCharge,
      isPaymentDone: user.isPaymentDone,
    });

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
      isKycOnline: setting?.isKycOnline,
      isPaymentRequired: role?.isPaymentRequired,
      onBoardCharge: paiseToRupee(role?.onBoardCharge),
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

    const user = await User.findOne({
      email,
      userName,
      isActive: true,
      isDeleted: false,
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found or not active" });
    }

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

    const html = generateOtpEmail({
      name: user?.firstName + " " + user?.lastName,
      otp: newOtp,
    });

    sendEmail(email, [], [], `Your OTP for User Login`, html);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    next(error);
  }
};

//from user dashboard
exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      isDeleted: false,
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const { currentPassword, newPassword } = req.body;

    const requiredFields = ["currentPassword", "newPassword"];
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

    const isOldPasswordValid = await bcrypt.comparePassword(
      currentPassword,
      user.password,
    );

    if (!isOldPasswordValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Old Password" });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from old password",
      });
    }

    const hashedPassword = await bcrypt.hashPassword(newPassword);
    user.password = hashedPassword;

    await user.save();
    return res.status(201).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.fetchProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const setting = await Setting.findOne();

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: "Setting not found",
      });
    }

    const isKycOnline = setting.isKycOnline;

    const [user] = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(userId),
          isDeleted: false,
        },
      },

      // role populate
      {
        $lookup: {
          from: "roles",
          localField: "roleId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                name: 1,
                onBoardCharge: 1,
                isPaymentRequired: 1,
              },
            },
          ],
          as: "roleId",
        },
      },
      {
        $unwind: {
          path: "$roleId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          roleId: "$roleId._id",
          roleName: "$roleId.name",
          onBoardCharge: "$roleId.onBoardCharge",
          isPaymentRequired: "$roleId.isPaymentRequired",
        },
      },

      // id charge populate
      {
        $lookup: {
          from: "idcharges",
          localField: "_id",
          foreignField: "userId",
          pipeline: [
            {
              $project: { rejectionReason: 1 },
            },
          ],
          as: "idcharges",
        },
      },
      {
        $unwind: {
          path: "$idcharges",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          idChargeRejectionReason: "$idcharges.rejectionReason",
        },
      },

      // package populate
      {
        $lookup: {
          from: "packages",
          localField: "packageId",
          foreignField: "_id",
          pipeline: [
            {
              $project: { name: 1 },
            },
          ],
          as: "packageId",
        },
      },
      {
        $unwind: {
          path: "$packageId",
          preserveNullAndEmptyArrays: true,
        },
      },

      // assignedServices populate (array)
      {
        $lookup: {
          from: "services",
          localField: "assignedServices.serviceId",
          foreignField: "_id",
          pipeline: [
            {
              $project: { name: 1 },
            },
          ],
          as: "serviceDetails",
        },
      },

      {
        $addFields: {
          assignedServices: {
            $map: {
              input: "$assignedServices",
              as: "service",
              in: {
                serviceId: "$$service.serviceId",
                pipelineCodes: "$$service.pipelineCodes",
                name: {
                  $let: {
                    vars: {
                      matchedService: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$serviceDetails",
                              as: "sd",
                              cond: {
                                $eq: ["$$sd._id", "$$service.serviceId"],
                              },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: "$$matchedService.name",
                  },
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "kycs",
          localField: "_id",
          foreignField: "userId",
          pipeline: [
            {
              $project: {
                aadharNumber: 1,
                panNumber: 1,
                personalAddress: 1,
                dob: 1,
              },
            },
          ],
          as: "additionalDetail",
        },
      },
      {
        $unwind: {
          path: "$additionalDetail",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          dob: "$additionalDetail.dob",
          panNumber: "$additionalDetail.panNumber",
          aadharNumber: "$additionalDetail.aadharNumber",
          personalAddress: "$additionalDetail.personalAddress",
        },
      },
      {
        $lookup: {
          from: "instantaepsoutlets",
          localField: "_id",
          foreignField: "userId",
          pipeline: [
            {
              $project: {
                isKycDone: 1,
                isAepsEnabled: 1,
                isLoginRequired: 1,
                action: 1,
              },
            },
          ],
          as: "merchant",
        },
      },
      {
        $unwind: {
          path: "$merchant",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          "aeps1.isVerified": "$merchant.isKycDone",
          "aeps1.isAepsEnabled": "$merchant.isAepsEnabled",
          "aeps1.isLoginRequired": "$merchant.isLoginRequired",
          "aeps1.action": "$merchant.action",
        },
      },
      {
        $lookup: {
          from: "ekoonboardaepsusers",
          localField: "_id",
          foreignField: "userId",
          pipeline: [
            {
              $project: {
                isActivated: 1,
                isLoginRequired: 1,
                action: 1,
              },
            },
          ],
          as: "onboardUser",
        },
      },
      {
        $unwind: {
          path: "$onboardUser",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          "aeps2.isActivated": "$onboardUser.isActivated",
          "aeps2.isLoginRequired": "$onboardUser.isLoginRequired",
        },
      },
      {
        $lookup: {
          from: "servicerequests",
          localField: "_id",
          foreignField: "userId",
          pipeline: [
            {
              $project: {
                pipelineCode: 1,
                status: 1,
                rejectionReason: 1,
              },
            },
          ],
          as: "serviceRequest",
        },
      },
      {
        $addFields: {
          requestedService: {
            $map: {
              input: {
                $filter: {
                  input: "$serviceRequest",
                  as: "sr",
                  cond: {
                    $in: ["$$sr.status", ["pending", "rejected"]],
                  },
                },
              },
              as: "sr",
              in: {
                serviceName: "$$sr.pipelineCode",
                status: "$$sr.status",
                reason: {
                  $ifNull: ["$$sr.rejectionReason", ""],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          onboardUser: 0,
          additionalDetail: 0,
          merchant: 0,
          serviceDetails: 0,
          serviceRequest: 0,
        },
      },
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const formattedData = user
      ? {
          ...user,
          onBoardCharge: paiseToRupee(user?.onBoardCharge),
          isKycOnline: isKycOnline,
        }
      : null;

    return res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.resendOtp = async (req, res, next) => {
  try {
    const { email, userName } = req.body;

    if (!email || !userName) {
      return res.status(400).json({
        success: false,
        message: "Email and Username are required",
      });
    }

    const user = await User.findOne({ email, userName });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await Otp.deleteMany({ userId: user._id });

    const newOtp = await generateOTP();

    const otp = new Otp({
      userId: user._id,
      otp: newOtp,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 min
    });

    await otp.save();

    await sendEmail(
      user.email,
      [],
      [],
      "Your OTP for User Login",
      `Your OTP is: ${newOtp}. It is valid for 2 minutes.`,
    );

    return res.status(200).json({
      success: true,
      message: "OTP resent successfully",
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

    const user = await User.findOne({
      email: email,
      isActive: true,
      isDeleted: false,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete old OTPs
    await Otp.deleteMany({
      userId: user._id,
      purpose: "FORGOT_PASSWORD",
    });

    const generatedOtp = generateOTP();

    // Hash OTP before saving

    await Otp.create({
      userId: user._id,
      otp: generatedOtp,
      purpose: "FORGOT_PASSWORD",
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
    });

    const html = generateOtpEmail({
      name: `${user.firstName} ${user.lastName}`,
      otp: generatedOtp,
      reason: "Password Reset",
    });

    await sendEmail(user.email, [], [], "Reset Password OTP", html);

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

    // if (savedOtp.expiresAt < new Date()) {
    //   const err = new Error("OTP has expired");
    //   err.statusCode = 400;
    //   throw err;
    // }

    savedOtp.isUsed = true;

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.passwordResetToken = resetToken;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; //10 minutes

    await savedOtp.save({ session: session });
    await user.save({ session: session });

    await Otp.deleteMany({ userId: user._id }).session(session);

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

    console.log(newPassword, "newPassword");
    console.log(confirmPassword, "confirmPassword");

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

    // Find user using reset token
    const user = await User.findOne({
      passwordResetToken: resetToken,

      resetPasswordExpires: {
        $gt: Date.now(),
      },

      isDeleted: false,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Prevent same password reuse
    const isSamePassword = await bcrypt.comparePassword(
      newPassword,
      user.password,
    );

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from old password",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hashPassword(newPassword);

    user.password = hashedPassword;
    // Clear reset token
    user.passwordResetToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};
