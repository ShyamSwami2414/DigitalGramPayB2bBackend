const Commission = require("../../models/commissionModel");
const User = require("../../models/userModel");
const mongoose = require("mongoose");
const { paiseToRupee } = require("../../utils/money");

const getMyCommissionPlan = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.packageId) {
      return res.status(400).json({
        success: false,
        message: "User package not exist",
      });
    }

    if (!user.assignedServices?.length) {
      return res.status(400).json({
        success: false,
        message: "No service assigned",
      });
    }

    const serviceIds = user.assignedServices.map(
      (s) => new mongoose.Types.ObjectId(s.serviceId),
    );

    const packageId = new mongoose.Types.ObjectId(user.packageId);

    const data = await Commission.aggregate([
      {
        $match: {
          packageId: packageId,
          serviceId: { $in: serviceIds },
        },
      },

      {
        $unwind: "$plan",
      },

      {
        $lookup: {
          from: "operators",
          localField: "operatorId",
          foreignField: "_id",
          as: "operator",
        },
      },

      {
        $lookup: {
          from: "bbpscategories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
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
        $addFields: {
          operator: { $arrayElemAt: ["$operator", 0] },
          category: { $arrayElemAt: ["$category", 0] },
          service: { $arrayElemAt: ["$service", 0] },
        },
      },

      {
        $project: {
          serviceId: 1,
          serviceName: "$service.name",

          type: {
            $cond: [
              { $ifNull: ["$operator._id", false] },
              "RECHARGE",
              {
                $cond: [{ $ifNull: ["$category._id", false] }, "BBPS", "OTHER"],
              },
            ],
          },

          name: {
            $ifNull: ["$operator.name", "$category.name"],
          },

          fromAmount: "$plan.from",
          toAmount: "$plan.to",
          commission: "$plan.commission",
          commissionType: "$plan.type",
        },
      },
      {
        $sort: {
          serviceId: 1,
          name: 1,
          fromAmount: 1,
        },
      },

      {
        $group: {
          _id: "$serviceId",
          serviceName: { $first: "$serviceName" },
          rows: {
            $push: {
              name: "$name",
              fromAmount: "$fromAmount",
              toAmount: "$toAmount",
              commission: "$commission",
              commissionType: "$commissionType",
              type: "$type",
            },
          },
        },
      },

      {
        $project: {
          _id: 0,
          serviceId: "$_id",
          serviceName: 1,
          rows: 1,
        },
      },
    ]);

    const formattedData = data.map((item) => ({
      ...item,
      rows: item.rows.map((row) => ({
        ...row,
        fromAmount: paiseToRupee(row.fromAmount),
        toAmount: paiseToRupee(row.toAmount),
        commission:
          row.commissionType === "percent"
            ? row.commission
            : paiseToRupee(row.commission),
      })),
    }));

    return res.status(200).json({
      success: true,
      message: "Commission Plan Fetched",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyCommissionPlan };
