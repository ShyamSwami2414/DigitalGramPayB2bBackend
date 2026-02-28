const User = require("../../models/userModel");
const Role = require("../../models/roleModel");
const mongoose = require("mongoose");
const { generateUserPassword } = require("../../utils/generateUserPassword");
const { hashPassword } = require("../../utils/bcrypt");
const { generateUsername } = require("../../utils/generateUsername");
const { generateUniquePin } = require("../../utils/uniquePinGenerator");
const { generateWelcomeEmail } = require("../../templates/emailTemplates/welcomeEmail");
const { sendEmail } = require("../../utils/email");

exports.getAllUsers = async (req, res, next) => {
  try {
    console.log(req.user, "user");
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const skip = (page - 1) * limit;

    if (isNaN(page) || isNaN(limit) || page <= 0 || limit <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid page or limit" });
    }

    const filter = { isDeleted: false, parentUserId: new mongoose.Types.ObjectId(req.user.id) };

    const users = await User.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "roles",
          localField: "roleId",
          foreignField: "_id",
          as: "role"
        },
      },
      {
        $unwind: {
          path: "$role",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          roleName: "$role.name"
        }
      },
      {
        $project: {
          role: 0
        }

      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ])

    console.log(users, "users")

    const total = await User.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    console.log(req.user, "user");
    const { firstName, lastName, email, phone, role } = req.body;

    const requiredFields = ["firstName", "lastName", "email", "phone", "role"];
    const missingField = []

    if (!firstName || !lastName || !email || !phone || !role) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(role)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid role ID" });
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

    console.log(isRoleValid, "Role");

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    if (isRoleValid.level <= req.user.level) {
      return res.status(400).json({
        success: false,
        message: `You are not authorized to create user with ${isRoleValid.name} role`
      });
    }

    const password = generateUserPassword();
    const hashedPassword = await hashPassword(password);

    const userName = await generateUsername();
    const pin = await generateUniquePin();

    const newUser = new User({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      userName: userName,
      roleId: role,
      pin: pin,
      parentUserId: req.user.id,
      level: req.user.level + 1,
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

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: newUser,
    });
  } catch (error) {
    next(error);
  }
};


exports.updateUserStatus = async (req, res, next) => {
  try {
    console.log(req.user, "user");
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid User Id Provided" });
    }

    const existingUser = await User.findOne({
      _id: id,
      isDeleted: false,
      parentUserId: req.user.id
    });

    if (!existingUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    console.log(existingUser, "existingUser");

    if (existingUser.level <= req.user.level) {
      return res.status(400).json({
        success: false,
        message: `You are not authorized to update this users status`
      });
    }

    existingUser.isActive = !existingUser.isActive;
    await existingUser.save();

    return res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: existingUser,
    });
  } catch (error) {
    next(error);
  }
};




