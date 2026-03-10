const User = require("../../models/userModel");
const Role = require("../../models/roleModel");
const Package = require("../../models/packageModel");
const Service = require("../../models/serviceModel");
const mongoose = require("mongoose");
const { generateUserPassword } = require("../../utils/generateUserPassword");
const { generateUsername } = require("../../utils/generateUsername");
const { generateUniquePin } = require("../../utils/uniquePinGenerator");
const { hashPassword } = require("../../utils/bcrypt");
const {
  generateWelcomeEmail,
} = require("../../templates/emailTemplates/welcomeEmail");
const { sendEmail } = require("../../utils/email");

exports.getAllUserList = async (req, res, next) => {
  try {
    const users = await User.aggregate([
      {
        $match: {
          isDeleted: false
        }
      },
      {
        $lookup: {
          from: "userwallets",
          localField: "_id",
          foreignField: "userId",
          as: "userWallet",
        },
      },
      {
        $unwind: {
          path: "$userWallet",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          aepsWallet: "$userWallet.aepsWallet",
          mainWallet: "$userWallet.mainWallet",
          aepsHold: "$userWallet.aepsHoldAmount",
          mainHold: "$userWallet.mainHoldAmount",
        }
      },
      {
        $project: {
          _id: 1,
          fullName: { $concat: ["$firstName", " ", "$lastName"] },
          email: 1,
          aepsWallet: 1,
          mainWallet: 1,
          aepsHold: 1,
          mainHold: 1,
        }
      }])

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: users,
    });

  } catch (error) {
    next(error);
  }
}

exports.getUserStats = async (req, res, next) => {
  try {
    const result = await Role.aggregate([

      {
        $lookup: {
          from: "users",
          let: { roleId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$roleId", "$$roleId"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "users"
        }
      },

      {
        $addFields: {
          count: { $size: "$users" }
        }
      },

      {
        $group: {
          _id: null,
          totalUsers: { $sum: "$count" },
          roles: { $push: "$$ROOT" }
        }
      },

      { $unwind: "$roles" },


      {
        $project: {
          _id: 0,
          role: "$roles.name",
          count: "$roles.count",
          percentage: {
            $cond: [
              { $eq: ["$totalUsers", 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ["$roles.count", "$totalUsers"] },
                      100
                    ]
                  },
                  2
                ]
              }
            ]
          }
        }
      }
    ]);

    console.log(result, "user stats result");

    return res
      .status(200)
      .json({ success: true, message: "User Stats Done", data: result });
  } catch (error) {
    next(error);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    let { page = 1, limit = 10, status = "", search = "" } = req.query;
    page = Number(page);
    limit = Number(limit);
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
        $addFields: {
          role: "$roleData.name"
        }
      },

      {
        $lookup: {
          from: "packages",
          localField: "packageId",
          foreignField: "_id",
          as: "packageData",
        },
      },

      {
        $unwind: {
          path: "$packageData",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $addFields: {
          package: "$packageData.name"
        }
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
          packageData: 0,
          packageId: 0,
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
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
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
    next(error);
  }
};

exports.updateUserStatus = async (req, res, next) => {
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
    next(error);
  }
};

exports.assignPackageToUser = async (req, res, next) => {
  try {
    const { packageId } = req.body;
    const { userId } = req.params;

    const missingFields = [];

    if (!packageId) missingFields.push("packageId");
    if (!userId) missingFields.push("userId");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${missingFields.join(", ")} is missing`,
        missingFields,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(packageId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid User Id or Package Id Provided" });
    }

    const existingPackage = await Package.findOne({
      _id: packageId,
      isActive: true,
      isDeleted: false,
    });

    if (!existingPackage) {
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });
    }

    const existingUser = await User.findOneAndUpdate({
      _id: userId,
      isDeleted: false,
    }, {
      $set: {
        packageId: packageId
      }
    }, { new: true });

    if (!existingUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Package assigned successfully",
      data: existingUser,
    });

  } catch (error) {
    next(error);
  }
}

exports.assignServiceToUser = async (req, res, next) => {
  try {
    const { services } = req.body;
    const { userId } = req.params;

    const missingFields = [];

    if (!services || !Array.isArray(services))
      missingFields.push("services");

    if (!userId) missingFields.push("userId");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${missingFields.join(", ")} is missing`,
        missingFields,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    const invalidIds = services.filter(
      id => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid service IDs",
        invalidIds,
      });
    }

    const validServices = await Service.find({
      _id: { $in: services },
      isActive: true,
      isDeleted: false,
    }).select("_id");

    const serviceIds = validServices.map(s => s._id);

    const existingUser = await User.findOneAndUpdate(
      { _id: userId, isDeleted: false },
      {
        assignedServices: serviceIds,
      },
      { new: true }
    );

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User services updated successfully",
      data: existingUser,
    });

  } catch (error) {
    next(error);
  }
};

exports.getAssignedServices = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User Id is missing",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid User Id Provided" });
    }

    const [user] = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(userId),
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: "services",
          localField: "assignedServices",
          foreignField: "_id",
          as: "services",
        },
      },
      {
        $project: {
          _id: 1,
          services: {
            $map: {
              input: "$services",
              as: "service",
              in: {
                id: "$$service._id",
                name: "$$service.name",
              },
            },
          },
        },
      },
    ]);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Assigned services fetched successfully",
      data: user,
    });

  } catch (error) {
    next(error);
  }
}
