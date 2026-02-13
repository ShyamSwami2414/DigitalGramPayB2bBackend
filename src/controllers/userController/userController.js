const User = require("../../models/userModel");
const Role = require("../../models/roleModel");
const mongoose = require("mongoose");
const { generateUserPassword } = require("../../utils/generateUserPassword");
const { hashPassword } = require("../../utils/bcrypt");
const { generateUsername } = require("../../utils/generateUsername");
const { generateUniquePin } = require("../../utils/uniquePinGenerator");

exports.getAllUsers = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const skip = (page - 1) * limit;

    if (isNaN(page) || isNaN(limit) || page <= 0 || limit <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid page or limit" });
    }

    const filter = { isDeleted: false };

    const users = await User.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

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
    console.error("Error fetching users:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, role } = req.body;

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

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
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
    console.error("Error creating user:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};
