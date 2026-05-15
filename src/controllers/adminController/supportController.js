const Support = require("../../models/supportModel");
const mongoose = require("mongoose");

exports.getSupportStats = async (req, res, next) => {
  try {
    const [result] = await Support.aggregate([
      {
        $match: {
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
            },
          },

          resolved: {
            $sum: {
              $cond: [{ $eq: ["$status", "resolved"] }, 1, 0],
            },
          },

          closed: {
            $sum: {
              $cond: [{ $eq: ["$status", "closed"] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Support stats fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.getSupportRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Support request ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid support request ID",
      });
    }

    const filter = {
      _id: new mongoose.Types.ObjectId(id),
      isDeleted: false,
    };

    const [supportRequest] = await Support.aggregate([
      {
        $match: filter,
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          fullName: { $concat: ["$user.firstName", " ", "$user.lastName"] },
          userName: "$user.userName",
        },
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
          serviceName: { $concat: ["$service.name"] },
        },
      },
      {
        $project: {
          ticketId: 1,
          transactionId: 1,
          fullName: 1,
          userName: 1,
          serviceName: 1,
          supportDetails: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          adminRemark: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Support request fetched successfully",
      data: supportRequest,
    });
  } catch (error) {
    next(error);
  }
};

exports.getSupportRequests = async (req, res, next) => {
  try {
    let { page = 1, limit = 10, status = "", search = "" } = req.query;
    page = Number(page);
    limit = Number(limit);
    status = status?.trim().toLowerCase();
    search = search?.trim();

    const skip = (page - 1) * limit;

    const filter = {
      isDeleted: false,
    };

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [{ ticketId: { $regex: search, $options: "i" } }];
    }

    const supportRequests = await Support.aggregate([
      {
        $match: filter,
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          fullName: { $concat: ["$user.firstName", " ", "$user.lastName"] },
          userName: "$user.userName",
        },
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
          serviceName: { $concat: ["$service.name"] },
        },
      },
      {
        $project: {
          ticketId: 1,
          transactionId: 1,
          fullName: 1,
          userName: 1,
          serviceName: 1,
          supportDetails: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
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
        totalPages: Math.ceil(total / limit),
        total: total,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateSupportStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { status } = req.body;
    status = status?.trim().toLowerCase();

    console.log(status, "status");

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Support request ID is required",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Support request status is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid support request ID",
      });
    }

    if (!["pending", "resolved", "closed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid support request status",
      });
    }

    const support = await Support.findOneAndUpdate(
      {
        _id: id,
        status: "pending",
      },
      {
        $set: {
          status: status,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!support) {
      return res.status(404).json({
        success: false,
        message: "Support request not found or already resolved",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Support request status updated successfully",
      data: support,
    });
  } catch (error) {
    next(error);
  }
};

exports.addRemark = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { remark } = req.body;
    remark = remark?.trim();
    console.log(remark, "remark");

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Support request ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid support request ID",
      });
    }

    if (!remark) {
      return res.status(400).json({
        success: false,
        message: "Admin remark is required",
      });
    }

    const support = await Support.findOneAndUpdate(
      {
        _id: id,
        // status: "pending",
      },
      {
        $set: {
          adminRemark: remark,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!support) {
      return res.status(404).json({
        success: false,
        message: "Support request not found or already resolved",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Support request status updated successfully",
      data: support,
    });
  } catch (error) {
    next(error);
  }
};
