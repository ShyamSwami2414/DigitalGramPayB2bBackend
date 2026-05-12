const User = require("../../models/userModel");
const Role = require("../../models/roleModel");
const mongoose = require("mongoose");
const { generateUserPassword } = require("../../utils/generateUserPassword");
const { hashPassword } = require("../../utils/bcrypt");
const { generateUsername } = require("../../utils/generateUsername");
const { generateUniquePin } = require("../../utils/uniquePinGenerator");
const {
  generateWelcomeEmail,
} = require("../../templates/emailTemplates/welcomeEmail");
const { sendEmail } = require("../../utils/email");
const config = require("../../config/client");

const buildTree = (users) => {
  const map = {};
  let root = null;

  // Step 1: Create map
  users.forEach((user) => {
    map[user._id.toString()] = {
      ...user,
      children: [],
    };
  });

  // Step 2: Link nodes
  users.forEach((user) => {
    if (user.isSelf) {
      root = map[user._id.toString()];
    } else {
      const parent = map[user.parentUserId?.toString()];
      if (parent) {
        parent.children.push(map[user._id.toString()]);
      }
    }
  });

  return root;
};

exports.getAllUsers = async (req, res, next) => {
  try {
    console.log(req.user, "user");
    let { page = 1, limit = 10, search = "" } = req.query;
    page = Number(page);
    limit = Number(limit);

    const skip = (page - 1) * limit;

    if (isNaN(page) || isNaN(limit) || page <= 0 || limit <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid page or limit" });
    }

    const filter = {
      isDeleted: false,
      parentUserId: new mongoose.Types.ObjectId(req.user.id),
    };

    const users = await User.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "roles",
          localField: "roleId",
          foreignField: "_id",
          as: "role",
        },
      },
      {
        $unwind: {
          path: "$role",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "packages",
          localField: "packageId",
          foreignField: "_id",
          as: "package",
        },
      },
      {
        $unwind: {
          path: "$package",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          roleName: "$role.name",
          packageName: "$package.name",
        },
      },

      ...(search
        ? [
            {
              $match: {
                $or: [
                  { firstName: { $regex: search, $options: "i" } },
                  { lastName: { $regex: search, $options: "i" } },
                  { userName: { $regex: search, $options: "i" } },
                  { email: { $regex: search, $options: "i" } },
                  { phone: { $regex: search, $options: "i" } },
                  { roleName: { $regex: search, $options: "i" } },
                  { packageName: { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),
      {
        $project: {
          role: 0,
          package: 0,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    console.log(users, "users");

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

exports.getMyDownlineUsers = async (req, res, next) => {
  try {
    let { search = "" } = req.query;
    search = search?.trim();
    const userId = req.user.id;

    const result = await User.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(userId) },
      },
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { firstName: { $regex: search, $options: "i" } },
                  { lastName: { $regex: search, $options: "i" } },
                  { userName: { $regex: search, $options: "i" } },
                  { email: { $regex: search, $options: "i" } },
                  { phone: { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),
      {
        $graphLookup: {
          from: "users",
          startWith: "$_id",
          connectFromField: "_id",
          connectToField: "parentUserId",
          as: "downline",
          maxDepth: 5,
          depthField: "levelDepth",
        },
      },
      {
        $lookup: {
          from: "roles",
          localField: "downline.roleId",
          foreignField: "_id",
          as: "downlineRoles",
        },
      },

      // 🔽 Merge role into downline users
      {
        $addFields: {
          downline: {
            $map: {
              input: "$downline",
              as: "u",
              in: {
                $mergeObjects: [
                  "$$u",
                  {
                    role: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$downlineRoles",
                            as: "r",
                            cond: { $eq: ["$$r._id", "$$u.roleId"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },

      {
        $project: {
          allUsers: {
            $concatArrays: [
              [
                {
                  _id: "$_id",
                  parentUserId: "$parentUserId",
                  fullName: { $concat: ["$firstName", " ", "$lastName"] },
                  phone: "$phone",
                  email: "$email",
                  userName: "$userName",
                  levelDepth: -1, // special marker
                  isSelf: true,
                },
              ],
              {
                $map: {
                  input: {
                    $filter: {
                      input: "$downline",
                      as: "user",
                      cond: { $eq: ["$$user.isDeleted", false] },
                    },
                  },
                  as: "u",
                  in: {
                    _id: "$$u._id",
                    parentUserId: "$$u.parentUserId",
                    fullName: {
                      $concat: ["$$u.firstName", " ", "$$u.lastName"],
                    },
                    userName: "$$u.userName",
                    levelDepth: "$$u.levelDepth",
                    isSelf: false,
                    phone: "$$u.phone",
                    email: "$$u.email",
                    role: {
                      _id: "$$u.role._id",
                      name: "$$u.role.name",
                    },
                  },
                },
              },
            ],
          },
        },
      },
    ]);

    const flatUsers = result[0]?.allUsers || [];

    // Build tree
    const formattedData = buildTree(flatUsers, userId);

    return res.status(200).json({
      success: true,
      message: "Users Fetched Suceessfully",
      data: formattedData,
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
    const missingField = [];

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
    }).lean();

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

    const userRole = await Role.findById(req.user.role).select("level").lean();
    if (!userRole) {
      return res.status(404).json({
        success: false,
        message: "user role not found",
      });
    }

    if (isRoleValid.level <= userRole.level) {
      return res.status(400).json({
        success: false,
        message: `You are not authorized to create user with ${isRoleValid.name} role`,
      });
    }

    const password = generateUserPassword();
    const hashedPassword = await hashPassword(password);

    const userName = await generateUsername({ role: isRoleValid?.name });
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
      parentUserId: req.user.id,
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
        message: `You are not authorized to update this users status`,
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
