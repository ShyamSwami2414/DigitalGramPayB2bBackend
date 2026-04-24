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
const { paiseToRupee } = require("../../utils/money");
const userWallet = require("../../models/userWallet");

exports.getParticularUserDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid User Id Provided" });
    }

    const existingUser = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          isDeleted: false,
        },
      },

      //  ROLE
      {
        $lookup: {
          from: "roles",
          localField: "roleId",
          foreignField: "_id",
          as: "role",
        },
      },
      { $unwind: { path: "$role", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          roleName: "$role.name",
          onBoardCharge: "$role.onBoardCharge",
        },
      },

      //  WALLET
      {
        $lookup: {
          from: "userwallets",
          localField: "_id",
          foreignField: "userId",
          as: "userWallet",
        },
      },
      { $unwind: { path: "$userWallet", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          mainWallet: "$userWallet.mainWallet",
          aepsWallet: "$userWallet.aepsWallet",
          mainHoldAmount: "$userWallet.mainHoldAmount",
          aepsHoldAmount: "$userWallet.aepsHoldAmount",
        },
      },

      //  PACKAGE
      {
        $lookup: {
          from: "packages",
          localField: "packageId",
          foreignField: "_id",
          as: "package",
        },
      },
      { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          packageName: "$package.name",
        },
      },

      //  COMMISSION
      {
        $lookup: {
          from: "commissions",
          let: {
            pkgId: "$packageId",
            assignedServices: "$assignedServices",
          },

          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$packageId", { $toObjectId: "$$pkgId" }] },
                    {
                      $in: [
                        "$serviceId",
                        {
                          $map: {
                            input: { $ifNull: ["$$assignedServices", []] },
                            as: "as",
                            in: { $toObjectId: "$$as.serviceId" },
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },

            // SERVICE
            {
              $lookup: {
                from: "services",
                localField: "serviceId",
                foreignField: "_id",
                as: "service",
              },
            },
            { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },

            //  OPERATOR
            {
              $lookup: {
                from: "operators",
                localField: "operatorId",
                foreignField: "_id",
                as: "operator",
              },
            },
            {
              $unwind: { path: "$operator", preserveNullAndEmptyArrays: true },
            },

            //  CATEGORY
            {
              $lookup: {
                from: "bbpscategories",
                localField: "categoryId",
                foreignField: "_id",
                as: "category",
              },
            },
            {
              $unwind: { path: "$category", preserveNullAndEmptyArrays: true },
            },

            //  FIX NAME , CLEAN PLAN
            {
              $project: {
                serviceId: 1,
                serviceName: "$service.name",

                //  NEVER NULL NAME
                name: {
                  $ifNull: [
                    "$operator.name",
                    {
                      $ifNull: ["$category.name", "UNKNOWN"],
                    },
                  ],
                },

                plan: {
                  $map: {
                    input: {
                      $filter: {
                        input: "$plan",
                        as: "p",
                        cond: { $eq: ["$$p.isDeleted", false] },
                      },
                    },
                    as: "p",
                    in: {
                      from: "$$p.from",
                      to: "$$p.to",
                      commission: "$$p.commission",
                      type: "$$p.type",
                    },
                  },
                },
              },
            },

            //  MERGE SAME NAME (operator/category)
            {
              $group: {
                _id: {
                  serviceId: "$serviceId",
                  name: "$name",
                },
                serviceName: { $first: "$serviceName" },
                plans: { $push: "$plan" },
              },
            },

            //  FLATTEN PLANS
            {
              $project: {
                serviceId: "$_id.serviceId",
                serviceName: 1,
                name: "$_id.name",
                plans: {
                  $reduce: {
                    input: "$plans",
                    initialValue: [],
                    in: { $concatArrays: ["$$value", "$$this"] },
                  },
                },
              },
            },

            //   GROUP BY SERVICE
            {
              $group: {
                _id: "$serviceId",
                serviceName: { $first: "$serviceName" },
                data: {
                  $push: {
                    name: "$name",
                    plans: "$plans",
                  },
                },
              },
            },

            {
              $project: {
                _id: 0,
                serviceId: "$_id",
                serviceName: 1,
                data: 1,
              },
            },
          ],
          as: "commission",
        },
      },

      //  FINAL CLEANUP
      {
        $project: {
          password: 0,
          isDeleted: 0,
          isDeletedAt: 0,
          createdAt: 0,
          updatedAt: 0,
          role: 0,
          package: 0,
          userWallet: 0,
        },
      },
    ]);

    const formatUserData = (user) => {
      if (!user) return null;

      return {
        ...user,

        onBoardCharge: paiseToRupee(user?.onBoardCharge ?? 0),
        aepsWallet: paiseToRupee(user?.aepsWallet ?? 0),
        mainWallet: paiseToRupee(user?.mainWallet ?? 0),
        mainHoldAmount: paiseToRupee(user?.mainHoldAmount ?? 0),
        aepsHoldAmount: paiseToRupee(user?.aepsHoldAmount ?? 0),

        commission: user.commission?.map((service) => ({
          ...service,
          data: service.data?.map((item) => ({
            ...item,
            plans: item.plans?.map((plan) => ({
              ...plan,

              //  ALWAYS convert range
              from: paiseToRupee(plan.from),
              to: paiseToRupee(plan.to),

              //  ONLY convert commission if flat
              commission:
                plan.type === "flat"
                  ? paiseToRupee(plan.commission)
                  : plan.commission,
            })),
          })),
        })),
      };
    };

    const formattedData = existingUser.map((user) => formatUserData(user));

    return res.status(200).json({
      success: true,
      message: "User Fetched",
      data: formattedData[0],
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllUserList = async (req, res, next) => {
  try {
    const users = await User.aggregate([
      {
        $match: {
          isDeleted: false,
        },
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
        },
      },
      {
        $project: {
          _id: 1,
          fullName: { $concat: ["$firstName", " ", "$lastName"] },
          userName: "$userName",
          email: 1,
          aepsWallet: 1,
          mainWallet: 1,
          aepsHold: 1,
          mainHold: 1,
        },
      },
    ]);

    const formattedData = users.map((item) => ({
      ...item,
      aepsWallet: paiseToRupee(item?.aepsWallet),
      mainWallet: paiseToRupee(item?.mainWallet),
      aepsHold: paiseToRupee(item?.aepsHold),
      mainHold: paiseToRupee(item?.mainHold),
    }));

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

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
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "users",
        },
      },

      {
        $addFields: {
          count: { $size: "$users" },
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
                      100,
                    ],
                  },
                  2,
                ],
              },
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
          role: "$roleData.name",
        },
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
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $addFields: {
          package: "$packageData.name",
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
              "$parentUserData.lastName",
            ],
          },
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
      packageId: package,
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

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

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

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(packageId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid User Id or Package Id Provided",
      });
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

    const existingUser = await User.findOneAndUpdate(
      {
        _id: userId,
        isDeleted: false,
      },
      {
        $set: {
          packageId: packageId,
        },
      },
      { new: true },
    );

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
};

exports.assignServiceToUser = async (req, res, next) => {
  try {
    const { services } = req.body;
    const { userId } = req.params;

    //  Basic validation
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({
        success: false,
        message: "services must be a non-empty array",
      });
    }

    //  Validate each service object
    for (let i = 0; i < services.length; i++) {
      const { serviceId, pipelineCodes } = services[i];

      if (!serviceId || !mongoose.Types.ObjectId.isValid(serviceId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid serviceId at index ${i}`,
        });
      }

      if (!Array.isArray(pipelineCodes) || pipelineCodes.length === 0) {
        return res.status(400).json({
          success: false,
          message: `pipelineCodes required at index ${i}`,
        });
      }

      //  Fetch service with pipelines
      const service = await Service.findOne({
        _id: serviceId,
        isActive: true,
        isDeleted: false,
      }).select("pipeline");

      if (!service) {
        return res.status(404).json({
          success: false,
          message: `Service not found at index ${i}`,
        });
      }

      //  Validate pipelines
      const validPipelines = service.pipeline
        .filter((p) => p.isActive)
        .map((p) => p.code);

      console.log(validPipelines, "validPipelines");
      console.log(pipelineCodes, "pipelineCodes");

      const invalidPipelines = pipelineCodes.filter(
        (code) => !validPipelines.includes(code),
      );

      if (invalidPipelines.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid pipelineCodes at index ${i}`,
          invalidPipelines,
        });
      }
    }

    const user = await User.findOne({
      _id: userId,
      isDeleted: false,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const assignedServices = user.assignedServices || [];

    // existing services
    const updatedServices = [];

    services.forEach((newService) => {
      const existing = assignedServices.find(
        (s) => s.serviceId.toString() === newService.serviceId,
      );

      if (existing) {
        // replace pipelines (NOT merge)
        updatedServices.push({
          serviceId: newService.serviceId,
          pipelineCodes: newService.pipelineCodes,
        });
      } else {
        updatedServices.push(newService);
      }
    });

    //  This removes services not in request
    user.assignedServices = updatedServices;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "User services updated successfully",
      data: user,
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
};
