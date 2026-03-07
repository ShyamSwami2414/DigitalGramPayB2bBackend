const Package = require("../../models/packageModel");
const { generatePackageCode } = require("../../utils/generatePackageCode");
const mongoose = require("mongoose");

exports.createPackage = async (req, res, next) => {
  try {
    let { name, role } = req.body;
    name = name?.trim();

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const packageCode = await generatePackageCode(name);

    const existingPackage = await Package.findOne({
      name: name,
      packageCode: packageCode,
      isActive: true,
      isDeleted: false,
    });

    if (existingPackage) {
      return res
        .status(400)
        .json({ success: false, message: "Package already exists" });
    }

    const newPackage = new Package({
      name,
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
    const packages = await Package.find({ isDeleted: false });
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
    const { id } = req.params;
    let { name } = req.body;
    name = name?.trim();

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Id Provided" });
    }

    const existingPackage = await Package.findOne({
      name: name,
      isActive: true,
      isDeleted: false,
      _id: { $ne: id },
    });

    if (existingPackage) {
      return res.status(400).json({
        success: false,
        message: "Another package with the same name already exists",
      });
    }

    const updatedPackage = await Package.findByIdAndUpdate(
      id,
      { name },
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
