const mongoose = require("mongoose");
const User = require("../../models/userModel");
const BbpsReport = require("../../models/bbpsReportModel");
const { paiseToRupee } = require("../../utils/money");

const getBbpsStats = async (req, res, next) => {
  try {
    let { user = "", from = "", to = "" } = req.query;
    console.log(req.query);
    user = user?.trim();
    from = from?.trim();
    to = to?.trim();

    const filter = {};

    if (user) {
      if (!mongoose.Types.ObjectId.isValid(user)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid user ID" });
      }

      const userExist = await User.findOne({ _id: user });

      if (!userExist) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      filter.userId = new mongoose.Types.ObjectId(user);
    }

    if (from || to) {
      filter.createdAt = {};

      if (from) {
        filter.createdAt.$gte = new Date(from);
      }

      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    const [result] = await BbpsReport.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,

          // totals
          totalCount: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          totalCommission: { $sum: "$netCommission" },

          // SUCCESS
          successCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "SUCCESS"] }, 1, 0],
            },
          },
          successAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "SUCCESS"] }, "$amount", 0],
            },
          },

          // PENDING
          pendingCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0],
            },
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "PENDING"] }, "$amount", 0],
            },
          },

          // FAILED
          failedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0],
            },
          },
          failedAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "FAILED"] }, "$amount", 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,

          total: {
            count: "$totalCount",
            amount: "$totalAmount",
            commission: "$totalCommission",
          },

          success: {
            count: "$successCount",
            amount: "$successAmount",
          },

          pending: {
            count: "$pendingCount",
            amount: "$pendingAmount",
          },

          failed: {
            count: "$failedCount",
            amount: "$failedAmount",
          },
        },
      },
    ]);

    const formattedData = result
      ? {
          ...result,
          total: {
            count: result?.total?.count,
            amount: paiseToRupee(result?.total?.amount),
            commission: paiseToRupee(result?.total?.commission),
          },

          success: {
            count: result?.success?.count,
            amount: paiseToRupee(result?.success?.amount),
          },

          pending: {
            count: result?.pending?.count,
            amount: paiseToRupee(result?.pending?.amount),
          },

          failed: {
            count: result?.failed?.count,
            amount: paiseToRupee(result?.failed?.amount),
          },
        }
      : null;

    return res.status(200).json({
      success: true,
      message: "BBPS Report Stats",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getBbpsStats };
