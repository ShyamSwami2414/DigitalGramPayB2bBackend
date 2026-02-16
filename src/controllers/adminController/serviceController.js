const Service = require("../../models/serviceModel");
const { handleError } = require("../../utils/errorHandler");
const { generateServiceCode } = require("../../utils/generateServiceCode");
const mongoose = require("mongoose");

exports.createService = async (req, res) => {
  try {
    let { name } = req.body;
    name = name?.trim();

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const serviceCode = await generateServiceCode(name);

    const existingService = await Service.findOne({
      name: name,
      serviceCode: serviceCode,
      isActive: true,
      isDeleted: false,
    });

    if (existingService) {
      return res
        .status(400)
        .json({ success: false, message: "Service already exists" });
    }

    const newService = new Service({
      name,
      serviceCode,
    });

    await newService.save();

    return res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: newService,
    });
  } catch (error) {
    console.error("Error creating service:", error);
    return res.status(500).json({
      success: false,
      message: handleError(error),
    });
  }
};

exports.getAllServices = async (req, res) => {
  try {
    const services = await Service.find({ isActive: true, isDeleted: false })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Services fetched successfully",
      data: services,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.updateService = async (req, res) => {
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

    const existingService = await Service.findOne({
      name: name,
      isActive: true,
      isDeleted: false,
      _id: { $ne: id },
    });

    if (existingService) {
      return res.status(400).json({
        success: false,
        message: "Another service with the same name already exists",
      });
    }

    const updatedService = await Service.findByIdAndUpdate(
      id,
      { name },
      { new: true },
    );

    if (!updatedService) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: updatedService,
    });
  } catch (error) {
    console.error("Error updating service:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.updateServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Id Provided" });
    }

    const existingService = await Service.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!existingService) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    existingService.isActive = !existingService.isActive;
    await existingService.save();

    return res.status(200).json({
      success: true,
      message: "Service status updated successfully",
      data: existingService,
    });
  } catch (error) {
    console.error("Error updating service status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Id Provided" });
    }

    const existingService = await Service.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
      },
      { $set: { isDeleted: true, deletedAt: Date.now() } },
      { new: true },
    );

    if (!existingService) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Service deleted successfully" });
  } catch (error) {
    console.error("Error deleting service:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};
