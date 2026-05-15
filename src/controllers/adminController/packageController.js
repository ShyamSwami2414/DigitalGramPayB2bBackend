const Package = require("../../models/packageModel");
const User = require("../../models/userModel");
const Role = require("../../models/roleModel");
const { generatePackageCode } = require("../../utils/generatePackageCode");
const mongoose = require("mongoose");

exports.createPackage = async (req, res, next) => {
  try {
    let { name, role } = req.body;
    name = name?.trim()?.toUpperCase();
    role = role?.trim();

    const requiredFields = ["name", "role"];
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

    if (!mongoose.Types.ObjectId.isValid(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Role ID`,
      });
    }

    const packageCode = await generatePackageCode(name);

    const [roleExist, existingPackage] = await Promise.all([
      Role.findById({ _id: role }).select("name isActive").lean(),
      Package.exists({
        name: name,
        isActive: true,
        isDeleted: false,
      }),
    ]);

    if (!roleExist) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    if (existingPackage) {
      return res.status(400).json({
        success: false,
        message: "Package already exists",
      });
    }

    const newPackage = new Package({
      name,
      roleId: role,
      packageCode,
    });

    await newPackage.save();

    return res.status(201).json({
      success: true,
      message: "Package created successfully",
      data: newPackage,
    });
  } catch (error) {
    next(error);
  }
};

exports.getActivePackageList = async (req, res, next) => {
  try {
    const packages = await Package.find({
      isActive: true,
      isDeleted: false,
    })
      .select("name packageCode")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Packages fetched successfully",
      data: packages,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllPackages = async (req, res, next) => {
  try {
    let { search } = req.query;
    search = search?.trim();

    const packages = await Package.aggregate([
      {
        $match: { isDeleted: false },
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
        $unwind: {
          path: "$role",
          preserveNullAndEmptyArrays: true,
        },
      },

      ...(search
        ? [
            {
              $match: {
                $or: [
                  { "role.name": { $regex: search, $options: "i" } },
                  { name: { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),

      {
        $project: {
          name: 1,
          packageCode: 1,
          isActive: 1,
          createdAt: 1,
          roleId: "$role._id",
          roleName: "$role.name",
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Packages fetched successfully",
      data: packages,
    });
  } catch (error) {
    next(error);
  }
};

exports.getPackagesByRoleId = async (req, res, next) => {
  try {
    const { roleId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Role ID",
      });
    }

    const roleExist = await Role.findById(roleId)
      .select("name isActive")
      .lean();

    if (!roleExist) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    const packages = await Package.aggregate([
      {
        $match: {
          isDeleted: false,
          isActive: true,
          roleId: new mongoose.Types.ObjectId(roleId),
        },
      },
      {
        $project: {
          name: 1,
          packageCode: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Packages fetched successfully",
      data: packages,
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePackage = async (req, res, next) => {
  try {
    let { name, role } = req.body;
    console.log(req.body, "body");
    const { id } = req.params;
    console.log(id, "id");
    name = name?.trim()?.toUpperCase();
    role = role?.trim();

    const requiredFields = ["name", "role"];
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

    if (!mongoose.Types.ObjectId.isValid(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Role ID`,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Id Provided" });
    }

    const [roleExist, existingPackage] = await Promise.all([
      Role.findById({ _id: role }).select("name isActive").lean(),
      Package.exists({
        name: name,
        isDeleted: false,
        _id: { $ne: id },
      }),
    ]);

    if (!roleExist) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    if (existingPackage) {
      return res.status(400).json({
        success: false,
        message: "Package already exists",
      });
    }

    const updatedPackage = await Package.findByIdAndUpdate(
      { _id: id },
      { $set: { name: name, roleId: role } },
      { new: true },
    );

    if (!updatedPackage) {
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Package updated successfully",
      data: updatedPackage,
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePackageStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Id Provided" });
    }

    const existingPackage = await Package.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!existingPackage) {
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });
    }

    existingPackage.isActive = !existingPackage.isActive;
    await existingPackage.save();

    return res.status(200).json({
      success: true,
      message: "Package status updated successfully",
      data: existingPackage,
    });
  } catch (error) {
    next(error);
  }
};

exports.deletePackage = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Id Provided" });
    }

    const isPackageAssigned = await User.findOne({ packageId: id });

    if (isPackageAssigned) {
      return res
        .status(400)
        .json({ success: false, message: "Assigned Package can't be Deleted" });
    }

    const existingPackage = await Package.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
      },
      { $set: { isDeleted: true, deletedAt: Date.now() } },
      { new: true },
    );

    if (!existingPackage) {
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Package deleted successfully" });
  } catch (error) {
    next(error);
  }
};
