const Service = require("../../models/serviceModel");
const { handleError } = require("../../utils/errorHandler");
const { generateServiceCode } = require("../../utils/generateServiceCode");
const mongoose = require("mongoose");

exports.createService = async (req, res, next) => {
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
    next(error);
  }
};

exports.serviceListWithPipeline = async (req, res, next) => {
  try {
    const services = await Service.aggregate([
      {
        $match: {
          isActive: true,
          isDeleted: false,
        },
      },
      {
        $project: {
          name: 1,
          label: "$serviceCode",
          hasCategory: 1,
          pipeline: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Services fetched successfully",
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

exports.getActiveServiceList = async (req, res, next) => {
  try {
    const services = await Service.aggregate([
      {
        $match: {
          isActive: true,
          isDeleted: false,
        },
      },
      {
        $project: {
          name: 1,
          label: "$serviceCode",
          hasCategory: 1,
          pipelineOption: {
            $gt: [{ $size: "$pipeline" }, 1],
          },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Services fetched successfully",
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

exports.getSelectedServicePipelineList = async (req, res, next) => {
  try {
    const { serviceId } = req.query; //serviceId

    if (!serviceId || !mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service Id",
      });
    }

    const serviceExists = await Service.findOne({
      _id: serviceId,
      isActive: true,
      isDeleted: false,
    })
      .select("_id")
      .lean();

    if (!serviceExists) {
      return res.status(404).json({
        success: false,
        message: "Service not found or inactive",
      });
    }

    const services = await Service.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(serviceId),
          isActive: true,
          isDeleted: false,
        },
      },
      {
        $project: {
          _id: 0,
          pipeline: 1,
        },
      },
    ]);

    console.log(services, "services");

    return res.status(200).json({
      success: true,
      message: "Pipeline fetched successfully",
      data: services?.[0]?.pipeline,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateService = async (req, res, next) => {
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
    next(error);
  }
};

exports.updateServiceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Id Provided" });
    }

    const existingService = await Service.findOne({
      "pipeline._id": id,
      isDeleted: false,
    });

    if (!existingService) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    const pipelineItem = existingService.pipeline.id(id);

    if (!pipelineItem) {
      return res
        .status(404)
        .json({ success: false, message: "Pipeline not found" });
    }

    pipelineItem.isActive = !pipelineItem.isActive;

    await existingService.save();

    return res.status(200).json({
      success: true,
      message: "Service status updated successfully",
      data: existingService,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteService = async (req, res, next) => {
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
    next(error);
  }
};
