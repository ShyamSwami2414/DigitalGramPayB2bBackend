const mongoose = require("mongoose");
const OnlineService = require("../../models/onlineServiceModel");

exports.getOnlineServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "ID Required" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "ID Required" });
    }

    const filter = { _id: new mongoose.Types.ObjectId(id), isDeleted: false };

    const [onlineService] = await OnlineService.aggregate([
      { $match: filter },
      {
        $project: {
          _id: 1,
          serviceName: 1,
          description: 1,
          serviceImageUrl: 1,
          createdAt: 1,
        },
      },
    ]);

    const total = await OnlineService.countDocuments();

    if (!onlineService) {
      return res
        .status(404)
        .json({ success: false, message: "Service Not Found" });
    }

    const formattedData = onlineService ? { ...onlineService } : null;

    return res.status(200).json({
      success: true,
      message: "Online Service Fetched Successfully ",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.listAllOnlineServices = async (req, res, next) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = Number(page);
    limit = Number(limit);

    const skip = (page - 1) * limit;

    const onlineServices = await OnlineService.aggregate([
      { $match: { isDeleted: false } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const total = await OnlineService.countDocuments();

    const formattedData = onlineServices.map((item) => ({
      ...item,
    }));

    return res.status(200).json({
      success: true,
      message: "Online Service Fetched Successfully ",
      data: formattedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createOnlineService = async (req, res, next) => {
  try {
    let { serviceName, serviceUrl, description } = req.body;
    serviceName = serviceName?.trim();
    serviceUrl = serviceUrl?.trim();

    const onlineServiceImage = req.file?.filename;

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        message: "Service name is required",
      });
    }

    if (!serviceUrl) {
      return res.status(400).json({
        success: false,
        message: "Service url is required",
      });
    }

    serviceName = serviceName?.trim().toLowerCase();

    const urlRegex =
      /^(https?:\/\/)([\w.-]+)\.([a-z]{2,})([\/\w .-]*)*\/?(\?.*)?(#.*)?$/i;

    if (!urlRegex.test(serviceUrl)) {
      return res.status(400).json({
        success: false,
        message: "Invalid URL format",
      });
    }

    const existingService = await OnlineService.findOne({
      serviceName,
      serviceUrl,
      isDeleted: false,
    });

    if (existingService) {
      return res.status(400).json({
        success: false,
        message: "This Service already exists",
      });
    }

    const newService = await OnlineService.create({
      serviceName,
      serviceUrl,
      serviceImageUrl: `/uploads/onlineServices/${onlineServiceImage}`,
    });

    return res.status(201).json({
      success: true,
      message: "Online Service Created Successfully",
      data: newService,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateOnlineService = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { serviceName, serviceUrl, description } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "ID Required" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        message: "Service name required",
      });
    }

    if (!serviceUrl) {
      return res.status(400).json({
        success: false,
        message: "Service url is required",
      });
    }

    const existingService = await OnlineService.findById(id);
    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: "Online service not found",
      });
    }

    serviceName = serviceName?.trim().toLowerCase();

    const duplicateService = await OnlineService.findOne({
      serviceName,
      _id: { $ne: id },
    });

    if (duplicateService) {
      return res.status(409).json({
        success: false,
        message: "Service name already exists",
      });
    }

    let imageUrl = existingService.serviceImageUrl;

    if (req.file) {
      imageUrl = `/uploads/onlineServices/${req.file?.filename}`;
    }

    // If you want image mandatory on update, uncomment below:
    /*
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Service image is required",
            });
        }
        */

    // -----------------------
    // Update Service
    // -----------------------
    const updatedService = await OnlineService.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
      },
      {
        serviceName,
        serviceUrl,
        description,
        serviceImageUrl: imageUrl,
      },
      { new: true },
    );

    if (!updatedService) {
      return res.status(400).json({
        success: false,
        message: "Online Service Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Online Service Updated Successfully",
      data: updatedService,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteOnlineService = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: "ID Required" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const deleted = await OnlineService.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: "Online Service Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Online Service Deleted Successfully",
    });
  } catch (error) {
    next(error);
  }
};
