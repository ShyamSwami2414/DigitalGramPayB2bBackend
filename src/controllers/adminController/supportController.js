const Support = require("../../models/supportModel");
const mongoose = require("mongoose");

exports.getSupportStats = async (req, res, next) => {
  try {
    let {
      page = 1,
      limit = 10,
      status = "",
      userId = "",

      from = "",
      to = "",
      range = "",
      search = "",
    } = req.query;
    page = Number(page);
    limit = Number(limit);
    status = status?.trim().toLowerCase();
    search = search?.trim();
    range = typeof range === "string" ? range?.trim().toLowerCase() : "";
    from = typeof from === "string" ? from.trim() : "";
    to = typeof to === "string" ? to.trim() : "";

    // normalize invalid inputs
    if (!from || from === "null" || from === "undefined") {
      from = undefined;
    }

    if (!to || to === "null" || to === "undefined") {
      to = undefined;
    }

    if (!range || range === "null" || range === "undefined") {
      range = undefined;
    }

    const skip = (page - 1) * limit;
    const filter = {
      isDeleted: false,
    };

    const now = new Date();
    let fromDate, toDate;

    const allowedStatus = ["resolved", "closed", "pending"];
    const allowedRanges = ["today", "yesterday", "last7days", "thismonth"];

    if (isNaN(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Page must be a valid number greater than 0",
      });
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 100",
      });
    }

    if (status && !allowedStatus.includes(status)) {
      const err = new Error("Invalid Status");
      err.statusCode = 400;
      throw err;
    }

    if (range && !allowedRanges.includes(range)) {
      const err = new Error("Invalid Range");
      err.statusCode = 400;
      throw err;
    }

    if (from && new Date(from) > now) {
      const err = new Error("Starting Date can not be in future");
      err.statusCode = 400;
      throw err;
    }

    if (to && new Date(to) > now) {
      const err = new Error("Ending Date can not be in future");
      err.statusCode = 400;
      throw err;
    }

    if (status) {
      filter.status = status?.toLowerCase();
    }

    if (range) {
      switch (range) {
        case "today":
          fromDate = new Date();
          fromDate.setHours(0, 0, 0, 0);

          toDate = new Date();
          toDate.setHours(23, 59, 59, 999);
          break;

        case "yesterday":
          fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 1);
          fromDate.setHours(0, 0, 0, 0);

          toDate = new Date();
          toDate.setDate(toDate.getDate() - 1);
          toDate.setHours(23, 59, 59, 999);
          break;

        case "last7days":
          fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 6); // includes today
          fromDate.setHours(0, 0, 0, 0);

          toDate = new Date();
          toDate.setHours(23, 59, 59, 999);
          break;

        case "thismonth":
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);

          toDate = new Date();
          toDate.setHours(23, 59, 59, 999);
          break;
      }
    } else {
      //  MANUAL DATE VALIDATION

      const isValidDate = (date) => !isNaN(new Date(date).getTime());

      if (from) {
        if (!isValidDate(from)) {
          const err = new Error("Invalid 'from' date");
          err.statusCode = 400;
          throw err;
        }
        fromDate = new Date(from);
      }

      if (to) {
        if (!isValidDate(to)) {
          const err = new Error("Invalid 'to' date");
          err.statusCode = 400;
          throw err;
        }
        toDate = new Date(to);
      }

      if (fromDate && toDate && fromDate > toDate) {
        const err = new Error("'from' cannot be greater than 'to'");
        err.statusCode = 400;
        throw err;
      }

      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
      }
    }

    //  APPLY DATE FILTER
    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) filter.createdAt.$gte = fromDate;
      if (toDate) filter.createdAt.$lte = toDate;
    }

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid user ID" });
      }

      const userExist = await User.findOne({ _id: userId }).lean();

      if (!userExist) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    console.log(filter, "filter");

    const [result] = await Support.aggregate([
      {
        $match: filter,
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

    const defaultStats = {
      total: 0,
      pending: 0,
      resolved: 0,
      closed: 0,
    };

    const stats = result || defaultStats;

    return res.status(200).json({
      success: true,
      message: "Support stats fetched successfully",
      data: stats,
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
    let {
      page = 1,
      limit = 10,
      status = "",
      userId = "",

      from = "",
      to = "",
      range = "",
      search = "",
    } = req.query;
    page = Number(page);
    limit = Number(limit);
    status = status?.trim().toLowerCase();
    search = search?.trim();
    range = typeof range === "string" ? range?.trim().toLowerCase() : "";
    from = typeof from === "string" ? from.trim() : "";
    to = typeof to === "string" ? to.trim() : "";

    // normalize invalid inputs
    if (!from || from === "null" || from === "undefined") {
      from = undefined;
    }

    if (!to || to === "null" || to === "undefined") {
      to = undefined;
    }

    if (!range || range === "null" || range === "undefined") {
      range = undefined;
    }

    const skip = (page - 1) * limit;
    const filter = {
      isDeleted: false,
    };

    if (status) {
      filter.status = status;
    }

    const now = new Date();
    let fromDate, toDate;

    const allowedStatus = ["resolved", "closed", "pending"];
    const allowedRanges = ["today", "yesterday", "last7days", "thismonth"];

    if (isNaN(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Page must be a valid number greater than 0",
      });
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 100",
      });
    }

    if (status && !allowedStatus.includes(status)) {
      const err = new Error("Invalid Status");
      err.statusCode = 400;
      throw err;
    }

    if (range && !allowedRanges.includes(range)) {
      const err = new Error("Invalid Range");
      err.statusCode = 400;
      throw err;
    }

    if (from && new Date(from) > now) {
      const err = new Error("Starting Date can not be in future");
      err.statusCode = 400;
      throw err;
    }

    if (to && new Date(to) > now) {
      const err = new Error("Ending Date can not be in future");
      err.statusCode = 400;
      throw err;
    }

    if (status) {
      filter.status = status?.toLowerCase();
    }

    if (range) {
      switch (range) {
        case "today":
          fromDate = new Date();
          fromDate.setHours(0, 0, 0, 0);

          toDate = new Date();
          toDate.setHours(23, 59, 59, 999);
          break;

        case "yesterday":
          fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 1);
          fromDate.setHours(0, 0, 0, 0);

          toDate = new Date();
          toDate.setDate(toDate.getDate() - 1);
          toDate.setHours(23, 59, 59, 999);
          break;

        case "last7days":
          fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 6); // includes today
          fromDate.setHours(0, 0, 0, 0);

          toDate = new Date();
          toDate.setHours(23, 59, 59, 999);
          break;

        case "thismonth":
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);

          toDate = new Date();
          toDate.setHours(23, 59, 59, 999);
          break;
      }
    } else {
      //  MANUAL DATE VALIDATION

      const isValidDate = (date) => !isNaN(new Date(date).getTime());

      if (from) {
        if (!isValidDate(from)) {
          const err = new Error("Invalid 'from' date");
          err.statusCode = 400;
          throw err;
        }
        fromDate = new Date(from);
      }

      if (to) {
        if (!isValidDate(to)) {
          const err = new Error("Invalid 'to' date");
          err.statusCode = 400;
          throw err;
        }
        toDate = new Date(to);
      }

      if (fromDate && toDate && fromDate > toDate) {
        const err = new Error("'from' cannot be greater than 'to'");
        err.statusCode = 400;
        throw err;
      }

      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
      }
    }

    //  APPLY DATE FILTER
    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) filter.createdAt.$gte = fromDate;
      if (toDate) filter.createdAt.$lte = toDate;
    }

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid user ID" });
      }

      const userExist = await User.findOne({ _id: userId }).lean();

      if (!userExist) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    console.log(filter, "filter");
    const escapeRegex = (text) => {
      return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    const safeSearch = escapeRegex(search);
    const result = await Support.aggregate([
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
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { ticketId: { $regex: safeSearch, $options: "i" } },
                  { transactionId: { $regex: safeSearch, $options: "i" } },
                  { supportDetails: { $regex: safeSearch, $options: "i" } },
                  { status: { $regex: safeSearch, $options: "i" } },
                  { fullName: { $regex: safeSearch, $options: "i" } },
                  { userName: { $regex: safeSearch, $options: "i" } },
                  { serviceName: { $regex: safeSearch, $options: "i" } },
                ],
              },
            },
          ]
        : []),
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
        $facet: {
          data: [
            {
              $skip: skip,
            },

            {
              $limit: limit,
            },
          ],

          totalCount: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    const data = result?.[0]?.data || [];
    const total = result?.[0]?.totalCount?.[0]?.count || 0;

    return res.status(200).json({
      success: true,
      message: "Support requests fetched successfully",
      data: data,
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
