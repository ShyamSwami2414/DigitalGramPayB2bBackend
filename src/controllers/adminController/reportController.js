const mongoose = require("mongoose");
const Service = require("../../models/serviceModel");
const RechargeReport = require("../../models/rechargeReportModel");
const DmtReport = require("../../models/dmtReportModel");
const BBpsReport = require("../../models/bbpsReportModel");

const serviceModelMap = {
  recharge: RechargeReport,
  dmt: DmtReport,
  bbps: BBpsReport,
};

exports.getServiceWiseReport = async (req, res, next) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      from = "",
      to = "",
      serviceId = "",
    } = req.query;
    page = Number(page);
    limit = Number(limit);
    search = search?.trim();
    const skip = (page - 1) * limit;

    const filter = {};

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

    if (from && isNaN(Date.parse(from))) {
      return res.status(400).json({
        success: false,
        message: "Invalid 'from' date",
      });
    }

    if (to && isNaN(Date.parse(to))) {
      return res.status(400).json({
        success: false,
        message: "Invalid 'to' date",
      });
    }

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: "Service ID Is required",
      });
    }

    if (serviceId && !mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service id",
      });
    }

    let isServiceExist;
    if (serviceId) {
      isServiceExist = await Service.findOne({ _id: serviceId });

      if (!isServiceExist) {
        return res.status(404).json({
          success: false,
          message: "Service not Found",
        });
      }
    }

    const ReportModel = serviceModelMap[isServiceExist?.name?.toLowerCase()];

    if (!ReportModel) {
      return res.status(400).json({
        success: false,
        message: `No report model configured for service: ${isServiceExist?.name}`,
      });
    }

    // Filter by date range
    if (from || to) {
      filter.createdAt = {};

      if (from) {
        filter.createdAt.$gte = new Date(from);
      }

      if (to) {
        filter.createdAt.$lte = new Date(to);
      }
    }

    if (search) {
      filter.$or = [
        {
          amount: {
            $regex: search,
            $options: "i",
          },
        },

        {
          mobileNumber: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    console.log(ReportModel, "ReportModel");

    const serviceWiseReport = await ReportModel.aggregate([
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
        $unwind: "$user",
      },
      {
        $addFields: {
          fullName: { $concat: ["$user.firstName", " ", "$user.lastName"] },
          userName: "$user.userName",
        },
      },
      {
        $project: {
          user: 0,
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

    const total = await ReportModel.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: "Service Wise Report fetched successfully",
      data: serviceWiseReport,
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
