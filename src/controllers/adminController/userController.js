const User = require("../../models/userModel");
const Role = require("../../models/roleModel");
const Package = require("../../models/packageModel");
const mongoose = require("mongoose");
const { generateUserPassword } = require("../../utils/generateUserPassword");
const { generateUsername } = require("../../utils/generateUsername");
const { generateUniquePin } = require("../../utils/uniquePinGenerator");
const { hashPassword } = require("../../utils/bcrypt");
const {
  generateWelcomeEmail,
} = require("../../templates/emailTemplates/welcomeEmail");
const { sendEmail } = require("../../utils/email");

exports.getUserStats = async (req, res) => {
  try {
    const result = await User.aggregate([
      {
        $match: {
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: "roles",
          localField: "roleId",
          foreignField: "_id",
          as: "role",
        },
      },
      {
        $unwind: "$role",
      },
      {
        $group: {
          _id: "$role.name",
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: "$count" },
          roles: { $push: "$$ROOT" },
        },
      },

      { $unwind: "$roles" },

      {
        $project: {
          _id: 0,
          role: "$roles._id",
          count: "$roles.count",
          percentage: {
            $round: [
              {
                $round: [{ $divide: ["$roles.count", "$totalUsers"] }, 2],
              },
              2,
            ],
          },
        },
      },
    ]);

    console.log(result, "user stats result");

    return res
      .status(200)
      .json({ success: true, message: "User Stats Done", data: result });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    let { page = 1, limit = 10, status = "", search = "" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    status = status.trim();

    const skip = (page - 1) * limit;
    const filter = { isDeleted: false };

    if (isNaN(page) || isNaN(limit) || page <= 0 || limit <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid page or limit" });
    }

    if (status && status.toLowerCase() === "active") {
      filter.isActive = true;
    } else if (status && status.toLowerCase() === "inactive") {
      filter.isActive = false;
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.aggregate([
      { $match: filter },

      {
        $lookup: {
          from: "roles",
          localField: "roleId",
          foreignField: "_id",
          as: "roleData",
        },
      },

      {
        $unwind: {
          path: "$roleData",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "parentUserId",
          foreignField: "_id",
          as: "parentUserData",
        },
      },

      {
        $unwind: {
          path: "$parentUserData",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Add new field "role"
      {
        $addFields: {
          parentUser: {
            $concat: [
              "$parentUserData.firstName",
              " ",
              "$parentUserData.lastName"
            ]
          }
        },
      },

      {
        $project: {
          parentUserData: 0,
          parentUserId: 0,
          roleId: 0,
          roleData: 0,
        },
      },

      { $sort: { createdAt: -1 } },

      { $skip: skip },
      { $limit: limit },
    ]);

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
    const { firstName, lastName, email, phone, role, package } = req.body;

    if (!firstName || !lastName || !email || !phone || !role || !package) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(role)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid role ID" });
    }

    if (!mongoose.Types.ObjectId.isValid(package)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid package ID" });
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

    const isPackageValid = await Package.findOne({
      _id: package,
      isActive: true,
      isDeleted: false,
    });

    if (!isPackageValid) {
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });
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
      packageId: package,
      pin: pin,
      parentUserId: req.user.id,
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

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid User Id Provided" });
    }

    const existingUser = await User.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!existingUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    existingUser.isActive = !existingUser.isActive;
    await existingUser.save();

    return res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: existingUser,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
