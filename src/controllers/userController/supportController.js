const Support = require("../../models/supportModel");
const mongoose = require("mongoose");
const Service = require("../../models/serviceModel");

exports.getTicketStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await Support.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
          },
          closed: {
            $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          pending: 1,
          resolved: 1,
          closed: 1,
          total: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Ticket stats fetched successfully",
      data: result[0] || { pending: 0, resolved: 0, closed: 0, total: 0 },
    });
  } catch (error) {
    next(error);
  }
};

exports.getMySupportRequests = async (req, res, next) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = Number(page);
    limit = Number(limit);

    const skip = (page - 1) * limit;
    const filter = {
      userId: new mongoose.Types.ObjectId(req.user.id),
      isDeleted: false,
    };

    const supportRequests = await Support.aggregate([
      {
        $match: filter,
      },
      {
        $lookup: {
          from: "services",
          localField: "serviceId",
          foreignField: "_id",
          as: "service",
        },
      },
      {
        $unwind: {
          path: "$service",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          serviceName: "$service.name",
        },
      },
      {
        $project: {
          service: 0,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    const total = await Support.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: "Support requests fetched successfully",
      data: supportRequests,
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

exports.getSupportRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(req.params, "params");
    const filter = {
      userId: new mongoose.Types.ObjectId(req.user.id),
      _id: new mongoose.Types.ObjectId(id),
      isDeleted: false,
    };

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Support ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Support ID",
      });
    }

    const [supportRequest] = await Support.aggregate([
      {
        $match: filter,
      },
      {
        $lookup: {
          from: "services",
          localField: "serviceId",
          foreignField: "_id",
          as: "service",
        },
      },
      {
        $unwind: {
          path: "$service",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          serviceName: "$service.name",
        },
      },
      {
        $project: {
          service: 0,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Support Request Fetched",
      data: supportRequest,
    });
  } catch (error) {
    next(error);
  }
};

exports.createSupportRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { serviceId, supportDetails, transactionId } = req.body;
    const requiredFields = ["serviceId", "supportDetails"];
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

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid serviceId",
      });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const support = new Support({
      userId,
      serviceId,
      transactionId,
      supportDetails,
    });

    await support.save();

    return res.status(201).json({
      success: true,
      message: "Support request created successfully",
      data: support,
    });
  } catch (error) {
    next(error);
  }
};
