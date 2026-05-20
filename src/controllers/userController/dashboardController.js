const mongoose = require("mongoose");
const FundRequest = require("../../models/fundRequestModel");
const WalletTopupBank = require("../../models/walletTopupBankModel");
const Transaction = require("../../models/transactionModel");
const User = require("../../models/userModel");
const Service = require("../../models/serviceModel");
const { rupeeToPaise, paiseToRupee } = require("../../utils/money");
const {
  generateUniqueRefernceId,
} = require("../../utils/generateUniqueReferenceId");
const Payout = require("../../models/sozopayoutTransactionModel");

const RechargeReport = require("../../models/rechargeReportModel");
const BbpsReport = require("../../models/bbpsReportModel");
const DmtReport = require("../../models/dmtReportModel");
const InstantAepsReport = require("../../models/instantAepsReportModel");
const EkoAepsReport = require("../../models/ekoAepsReportModel");
const WalletLedger = require("../../models/walletLedgerModel");
const PayoutReport = require("../../models/sozopayoutTransactionModel");
const {
  buildTransactionFilters,
} = require("../../helpers/commonTransactionFilter");

exports.getTopupStats = async (req, res, next) => {
  try {
    let { status = "", from = "", to = "", range = "" } = req.query;
    status = status?.trim().toLowerCase();

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

    const filter = { userId: new mongoose.Types.ObjectId(req.user.id) };
    const now = new Date();
    let fromDate, toDate;

    const allowedStatus = ["pending", "approved", "rejected"];
    const allowedRanges = ["today", "yesterday", "last7days", "thismonth"];

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
      filter.status = status;
    }

    if (range) {
      const now = new Date();

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

    const [result] = await FundRequest.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalAmount: { $sum: "$amount" },

          //approved
          //   approvedCount: {
          //     $sum: {
          //       $cond: [{ $eq: ["$status", "approved"] }, 1, 0],
          //     },
          //   },
          //   approvedAmount: {
          //     $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$amount", 0] },
          //   },

          //pending
          pendingCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
            },
          },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] },
          },

          //rejected
          //   rejectedCount: {
          //     $sum: {
          //       $cond: [{ $eq: ["$status", "rejected"] }, 1, 0],
          //     },
          //   },
          //   rejectedAmount: {
          //     $sum: { $cond: [{ $eq: ["$status", "rejected"] }, "$amount", 0] },
          //   },
        },
      },
      {
        $project: {
          _id: 0,
          total: {
            count: "$totalCount",
            amount: "$totalAmount",
          },

          pending: {
            count: "$pendingCount",
            amount: "$pendingAmount",
          },
        },
      },
    ]);

    const defaultStats = {
      total: { count: 0, amount: 0 },

      pending: { count: 0, amount: 0 },
    };

    const formattedData = result
      ? {
          ...result,
          total: {
            count: result?.total?.count,
            amount: paiseToRupee(result?.total?.amount),
          },

          pending: {
            count: result?.pending?.count,
            amount: paiseToRupee(result?.pending?.amount),
          },
        }
      : defaultStats;

    return res.status(200).json({
      success: true,
      message: "Topup Request Stats",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getServiceMonthlyStats = async (req, res, next) => {
  try {
    let { year, serviceType } = req.query;

    serviceType = serviceType?.trim().toLowerCase();

    const userId = new mongoose.Types.ObjectId(req.user.id);

    const selectedYear = year ? parseInt(year) : new Date().getFullYear();

    // VALIDATE YEAR
    if (year && (isNaN(selectedYear) || selectedYear < 2000)) {
      return res.status(400).json({
        success: false,
        message: "Invalid year",
      });
    }

    const startDate = new Date(`${selectedYear}-01-01T00:00:00.000Z`);

    const endDate = new Date(`${selectedYear}-12-31T23:59:59.999Z`);

    // BASE FILTER
    const baseFilter = {
      userId,
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    // SERVICE MODEL MAP
    const serviceModels = {
      recharge1: RechargeReport,
      dmt1: DmtReport,
      bbps1: BbpsReport,
      aeps1: InstantAepsReport,
      aeps2: EkoAepsReport,
      payout1: PayoutReport,
      // "online-service": "",
      // "offline-service": "",
    };

    let selectedModels = [];

    // SINGLE SERVICE
    if (serviceType) {
      // payout subtype handling
      if (
        serviceType === "aeps-payout1" ||
        serviceType === "xpress-payout1" ||
        serviceType === "upi-payout1"
      ) {
        selectedModels.push({
          serviceType,
          model: PayoutReport,
        });
      } else {
        if (!serviceModels[serviceType]) {
          return res.status(400).json({
            success: false,
            message: "Invalid service type",
          });
        }

        selectedModels.push({
          serviceType,
          model: serviceModels[serviceType],
        });
      }
    } else {
      // ALL SERVICES
      selectedModels = Object.entries(serviceModels).map(
        ([serviceType, model]) => ({
          serviceType,
          model,
        }),
      );
    }

    // FETCH DATA
    const statistics = await Promise.all(
      selectedModels.map(async ({ serviceType, model }) => {
        const currentFilter = {
          ...baseFilter,
        };

        // payout subtype filters
        if (serviceType === "aeps-payout1") {
          currentFilter.serviceType = "AEPS_PAYOUT";
        }

        if (serviceType === "xpress-payout1") {
          currentFilter.serviceType = "XPRESS_PAYOUT";
        }

        const data = await model.aggregate([
          {
            $match: currentFilter,
          },

          {
            $group: {
              _id: {
                month: {
                  $month: "$createdAt",
                },
              },

              totalAmount: {
                $sum: {
                  $ifNull: ["$amount", 0],
                },
              },
            },
          },

          {
            $project: {
              _id: 0,
              month: "$_id.month",
              totalAmount: 1,
            },
          },

          {
            $sort: {
              month: 1,
            },
          },
        ]);

        return {
          serviceType,
          data,
        };
      }),
    );

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    // FORMAT RESPONSE
    const formatted = statistics.map((service) => {
      const monthlyData = monthNames.map((name, index) => {
        const found = service.data.find((d) => d.month === index + 1);

        return {
          month: name,

          amount: found ? paiseToRupee(found.totalAmount) : 0,
        };
      });

      return {
        serviceType: service.serviceType,
        monthlyStats: monthlyData,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Monthly payout stats fetched successfully",
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

exports.getPerformanceStats = async (req, res, next) => {
  try {
    let { serviceType = "", from = "", to = "", range = "" } = req.query;

    serviceType = serviceType?.trim().toLowerCase();

    range = typeof range === "string" ? range.trim().toLowerCase() : "";

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

    const filter = {
      userId: new mongoose.Types.ObjectId(req.user.id),
    };

    const now = new Date();

    let fromDate;
    let toDate;

    const allowedRanges = ["today", "yesterday", "last7days", "thismonth"];

    // RANGE VALIDATION
    if (range && !allowedRanges.includes(range)) {
      const err = new Error("Invalid Range");

      err.statusCode = 400;

      throw err;
    }

    // FUTURE DATE VALIDATION
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

    // RANGE FILTER
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

          fromDate.setDate(fromDate.getDate() - 6);

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
      // MANUAL DATE VALIDATION

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

    // APPLY DATE FILTER
    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) {
        filter.createdAt.$gte = fromDate;
      }

      if (toDate) {
        filter.createdAt.$lte = toDate;
      }
    }

    // SERVICE MODEL MAP
    const serviceModels = {
      recharge1: RechargeReport,
      dmt1: DmtReport,
      bbps1: BbpsReport,
      aeps1: InstantAepsReport,
      aeps2: EkoAepsReport,
      payout1: PayoutReport,
      // "online-service": "",
      // "offline-service": "",
    };

    let selectedModels = [];

    // SINGLE SERVICE
    if (serviceType) {
      // payout services
      if (
        serviceType === "aeps-payout1" ||
        serviceType === "xpress-payout1" ||
        serviceType === "upi-payout1"
      ) {
        selectedModels.push({
          serviceType,
          model: PayoutReport,
        });
      } else {
        if (!serviceModels[serviceType]) {
          return res.status(400).json({
            success: false,
            message: "Invalid service type",
          });
        }

        selectedModels.push({
          serviceType,
          model: serviceModels[serviceType],
        });
      }
    } else {
      // ALL SERVICES
      selectedModels = Object.entries(serviceModels).map(
        ([serviceType, model]) => ({
          serviceType,
          model,
        }),
      );
    }

    // FETCH STATS
    const statistics = await Promise.all(
      selectedModels.map(async ({ serviceType, model }) => {
        let currentFilter = {
          ...filter,
        };

        // payout subtype filter
        if (serviceType === "aeps-payout1") {
          currentFilter.serviceType = "AEPS_PAYOUT";
        }

        if (serviceType === "xpress-payout1") {
          currentFilter.serviceType = "XPRESS_PAYOUT";
        }

        if (serviceType === "upi-payout1") {
          currentFilter.serviceType = "UPI_PAYOUT";
        }

        const result = await model.aggregate([
          {
            $match: currentFilter,
          },

          {
            $group: {
              _id: null,

              successCount: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        {
                          $eq: ["$status", "SUCCESS"],
                        },

                        {
                          $eq: ["$txnStatus", "SUCCESS"],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              failedCount: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        {
                          $eq: ["$status", "FAILED"],
                        },

                        {
                          $eq: ["$txnStatus", "FAILED"],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              successAmount: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        {
                          $eq: ["$status", "SUCCESS"],
                        },

                        {
                          $eq: ["$txnStatus", "SUCCESS"],
                        },
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              failedAmount: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        {
                          $eq: ["$status", "FAILED"],
                        },

                        {
                          $eq: ["$txnStatus", "FAILED"],
                        },
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },
            },
          },
        ]);

        return {
          serviceType,

          successTransaction: result[0]?.successCount || 0,

          failedTransaction: result[0]?.failedCount || 0,

          successAmount: paiseToRupee(result[0]?.successAmount || 0),

          failedAmount: paiseToRupee(result[0]?.failedAmount || 0),
        };
      }),
    );

    // OVERALL STATS
    const overall = statistics.reduce(
      (acc, curr) => {
        acc.successTransaction += curr.successTransaction;

        acc.failedTransaction += curr.failedTransaction;

        acc.successAmount += curr.successAmount;

        acc.failedAmount += curr.failedAmount;

        return acc;
      },
      {
        successTransaction: 0,
        failedTransaction: 0,
        successAmount: 0,
        failedAmount: 0,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Performance statistics fetched successfully",

      overall,

      data: statistics,
    });
  } catch (error) {
    next(error);
  }
};

exports.getVolumeAnalytics = async (req, res, next) => {
  try {
    let { from = "", to = "", range = "" } = req.query;
    range = typeof range === "string" ? range.trim().toLowerCase() : "";
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

    const filter = {
      userId: new mongoose.Types.ObjectId(req.user.id),
      status: "SUCCESS",
    };

    const now = new Date();

    let fromDate;
    let toDate;

    const allowedRanges = ["today", "yesterday", "last7days", "thismonth"];

    // RANGE VALIDATION
    if (range && !allowedRanges.includes(range)) {
      const err = new Error("Invalid Range");
      err.statusCode = 400;
      throw err;
    }

    // FUTURE DATE VALIDATION
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

    // RANGE FILTER
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
          fromDate.setDate(fromDate.getDate() - 6);
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
      // MANUAL DATE VALIDATION

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

    // APPLY DATE FILTER
    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) {
        filter.createdAt.$gte = fromDate;
      }

      if (toDate) {
        filter.createdAt.$lte = toDate;
      }
    }

    // ==========================================
    // SERVICE MODEL MAP
    // ==========================================

    const services = [
      {
        serviceType: "recharge1",
        model: RechargeReport,
      },

      {
        serviceType: "dmt1",
        model: DmtReport,
      },

      {
        serviceType: "bbps1",
        model: BbpsReport,
      },

      {
        serviceType: "aeps1",
        model: InstantAepsReport,
      },

      {
        serviceType: "aeps2",
        model: EkoAepsReport,
      },

      {
        serviceType: "aeps-payout1",
        model: PayoutReport,
        payoutType: "AEPS_PAYOUT",
      },

      {
        serviceType: "xpress-payout1",
        model: PayoutReport,
        payoutType: "XPRESS_PAYOUT",
      },

      {
        serviceType: "upi-payout1",
        model: PayoutReport,
        payoutType: "UPI_PAYOUT",
      },
    ];

    // ==========================================
    // FETCH VOLUME SERVICE WISE
    // ==========================================

    const statistics = await Promise.all(
      services.map(async ({ serviceType, model, payoutType }) => {
        let currentFilter = {
          ...filter,
        };

        // payout subtype filter
        if (payoutType) {
          currentFilter.serviceType = payoutType;
        }

        const result = await model.aggregate([
          {
            $match: currentFilter,
          },

          // =========================
          // TDS LOOKUP
          // =========================
          {
            $lookup: {
              from: "tdsledgers",
              let: {
                refId: "$referenceId",
                uid: "$userId",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: ["$referenceId", "$$refId"],
                        },
                        {
                          $eq: ["$userId", "$$uid"],
                        },
                      ],
                    },
                  },
                },
              ],
              as: "tds",
            },
          },

          // =========================
          // GST LOOKUP
          // =========================
          {
            $lookup: {
              from: "gstledgers",
              let: {
                refId: "$referenceId",
                uid: "$userId",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: ["$referenceId", "$$refId"],
                        },
                        {
                          $eq: ["$userId", "$$uid"],
                        },
                      ],
                    },
                  },
                },
              ],
              as: "gst",
            },
          },

          {
            $group: {
              _id: null,

              totalSuccessTransaction: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        {
                          $eq: ["$status", "SUCCESS"],
                        },
                        {
                          $eq: ["$txnStatus", "SUCCESS"],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              totalVolume: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        {
                          $eq: ["$status", "SUCCESS"],
                        },
                        {
                          $eq: ["$txnStatus", "SUCCESS"],
                        },
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              totalCommission: {
                $sum: {
                  $ifNull: [
                    {
                      $sum: "$tds.netCommission",
                    },
                    0,
                  ],
                },
              },

              // TOTAL TDS
              totalTds: {
                $sum: {
                  $ifNull: [
                    {
                      $sum: "$tds.tdsAmount",
                    },
                    0,
                  ],
                },
              },

              // TOTAL GST CHARGES
              totalCharges: {
                $sum: {
                  $ifNull: [
                    {
                      $sum: "$gst.totalCharge",
                    },
                    0,
                  ],
                },
              },

              // TOTAL GST AMOUNT
              totalGst: {
                $sum: {
                  $ifNull: [
                    {
                      $sum: "$gst.gstAmount",
                    },
                    0,
                  ],
                },
              },
            },
          },
        ]);

        return {
          serviceType,

          totalSuccessTransaction: result[0]?.totalSuccessTransaction || 0,

          totalVolume: paiseToRupee(result[0]?.totalVolume || 0),

          totalCommission: paiseToRupee(result[0]?.totalCommission || 0),

          totalTds: paiseToRupee(result[0]?.totalTds || 0),

          totalCharges: paiseToRupee(result[0]?.totalCharges || 0),

          totalGst: paiseToRupee(result[0]?.totalGst || 0),
        };
      }),
    );

    // ==========================================
    // OVERALL TOTAL
    // ==========================================

    const overall = statistics.reduce(
      (acc, curr) => {
        acc.totalSuccessTransaction += curr.totalSuccessTransaction;
        acc.totalVolume += curr.totalVolume;
        return acc;
      },
      {
        totalSuccessTransaction: 0,
        totalVolume: 0,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Volume fetched successfully",
      overall,
      data: statistics,
    });
  } catch (error) {
    next(error);
  }
};

exports.latestTransactions = async (req, res, next) => {
  try {
    let {
      user = "",
      service = "",
      status = "",
      from = "",
      to = "",
      range = "",
    } = req.query;

    console.log(req.query);
    user = user?.trim();
    service = service?.trim();
    status = status?.trim().toLowerCase();

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

    const filter = { userId: new mongoose.Types.ObjectId(req.user.id) };

    const now = new Date();
    let fromDate, toDate;

    const allowedStatus = ["success", "failed", "pending"];
    const allowedRanges = ["today", "yesterday", "last7days", "thismonth"];

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

    if (user) {
      if (!mongoose.Types.ObjectId.isValid(user)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid user ID" });
      }

      const userExist = await User.findOne({ _id: user }).lean();

      if (!userExist) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      filter.userId = new mongoose.Types.ObjectId(user);
    }

    if (service) {
      if (!mongoose.Types.ObjectId.isValid(service)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid service ID" });
      }

      const serviceExist = await Service.findOne({ _id: service }).lean();

      if (!serviceExist) {
        return res
          .status(404)
          .json({ success: false, message: "Service not found" });
      }
    }

    console.log(filter, "filter");

    const result = await Transaction.aggregate([
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
        $sort: {
          createdAt: -1,
        },
      },
      {
        $limit: 5,
      },
      {
        $project: { meta: 0, user: 0 },
      },
    ]);

    if (result.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No Data available",
        data: [],
      });
    }

    const formattedData = result.map((item) => ({
      ...item,
      amount: paiseToRupee(item?.amount),
    }));

    return res.status(200).json({
      success: true,
      message: "Transactions Fetched Successful",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.transactionStats = async (req, res, next) => {
  try {
    const filter = await buildTransactionFilters({
      reqUserId: req.user.id,
      query: req.query,
    });

    const stats = await Transaction.aggregate([
      {
        $match: filter,
      },

      {
        $group: {
          _id: null,

          totalTransactions: {
            $sum: 1,
          },

          successAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "SUCCESS"] }, "$amount", 0],
            },
          },

          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "PENDING"] }, "$amount", 0],
            },
          },

          failedAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "FAILED"] }, "$amount", 0],
            },
          },

          successCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "SUCCESS"] }, 1, 0],
            },
          },

          pendingCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0],
            },
          },

          failedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0],
            },
          },
        },
      },

      {
        $project: {
          _id: 0,

          totalTransactions: 1,

          successAmount: 1,
          pendingAmount: 1,
          failedAmount: 1,

          successCount: 1,
          pendingCount: 1,
          failedCount: 1,
        },
      },
    ]);

    const result = stats[0] || {
      totalTransactions: 0,

      successAmount: 0,
      pendingAmount: 0,
      failedAmount: 0,

      successCount: 0,
      pendingCount: 0,
      failedCount: 0,
    };

    // FORMAT AMOUNTS
    result.successAmount = paiseToRupee(result.successAmount || 0);

    result.pendingAmount = paiseToRupee(result.pendingAmount || 0);

    result.failedAmount = paiseToRupee(result.failedAmount || 0);

    return res.status(200).json({
      success: true,
      message: "Transaction stats fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.creditDebitStats = async (req, res, next) => {
  try {
    let {
      user = "",
      wallet = "",
      type = "",
      serviceType = "",
      from = "",
      to = "",
      range = "",
    } = req.query;

    // =========================
    // SANITIZE INPUTS
    // =========================

    user = user?.trim();

    wallet = typeof wallet === "string" ? wallet.trim().toLowerCase() : "";

    type = typeof type === "string" ? type.trim().toLowerCase() : "";

    serviceType =
      typeof serviceType === "string" ? serviceType.trim().toUpperCase() : "";

    range = typeof range === "string" ? range.trim().toLowerCase() : "";

    from = typeof from === "string" ? from.trim() : "";

    to = typeof to === "string" ? to.trim() : "";

    // =========================
    // NORMALIZE
    // =========================

    if (!from || from === "null" || from === "undefined") {
      from = undefined;
    }

    if (!to || to === "null" || to === "undefined") {
      to = undefined;
    }

    if (!range || range === "null" || range === "undefined") {
      range = undefined;
    }

    // =========================
    // BASE FILTER
    // =========================

    const filter = {
      userId: new mongoose.Types.ObjectId(req.user.id),
    };

    const now = new Date();

    let fromDate;
    let toDate;

    // =========================
    // ALLOWED VALUES
    // =========================

    const allowedTypes = ["credit", "debit"];

    const allowedRanges = ["today", "yesterday", "last7days", "thismonth"];

    const allowedWallets = ["main", "aeps", "payout", "upi"];

    // =========================
    // VALIDATIONS
    // =========================

    if (type && !allowedTypes.includes(type)) {
      const err = new Error("Invalid ledger type");
      err.statusCode = 400;
      throw err;
    }

    if (wallet && !allowedWallets.includes(wallet)) {
      const err = new Error("Invalid wallet");
      err.statusCode = 400;
      throw err;
    }

    if (range && !allowedRanges.includes(range)) {
      const err = new Error("Invalid range");
      err.statusCode = 400;
      throw err;
    }

    // =========================
    // DATE VALIDATIONS
    // =========================

    const isValidDate = (date) => !isNaN(new Date(date).getTime());

    if (from) {
      if (!isValidDate(from)) {
        const err = new Error("Invalid from date");

        err.statusCode = 400;
        throw err;
      }

      if (new Date(from) > now) {
        const err = new Error("From date cannot be future date");

        err.statusCode = 400;
        throw err;
      }
    }

    if (to) {
      if (!isValidDate(to)) {
        const err = new Error("Invalid to date");

        err.statusCode = 400;
        throw err;
      }

      if (new Date(to) > now) {
        const err = new Error("To date cannot be future date");

        err.statusCode = 400;
        throw err;
      }
    }

    // =========================
    // RANGE FILTER
    // =========================

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
          fromDate.setDate(fromDate.getDate() - 6);

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
      if (from) {
        fromDate = new Date(from);
      }

      if (to) {
        toDate = new Date(to);

        toDate.setHours(23, 59, 59, 999);
      }

      if (fromDate && toDate && fromDate > toDate) {
        const err = new Error("'from' cannot be greater than 'to'");

        err.statusCode = 400;
        throw err;
      }
    }

    // =========================
    // APPLY DATE FILTER
    // =========================

    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) {
        filter.createdAt.$gte = fromDate;
      }

      if (toDate) {
        filter.createdAt.$lte = toDate;
      }
    }

    // =========================
    // USER FILTER
    // =========================

    if (user) {
      if (!mongoose.Types.ObjectId.isValid(user)) {
        const err = new Error("Invalid user id");

        err.statusCode = 400;
        throw err;
      }

      const userExist = await User.findById(user).lean();

      if (!userExist) {
        const err = new Error("User not found");

        err.statusCode = 404;
        throw err;
      }

      filter.userId = new mongoose.Types.ObjectId(user);
    }

    // =========================
    // OPTIONAL FILTERS
    // =========================

    if (wallet) {
      filter.wallet = wallet;
    }

    if (type) {
      filter.type = type;
    }

    if (serviceType) {
      filter.serviceType = serviceType;
    }

    // =========================
    // AGGREGATION
    // =========================

    const stats = await WalletLedger.aggregate([
      {
        $match: filter,
      },

      {
        $group: {
          _id: null,

          totalTransactions: {
            $sum: 1,
          },

          totalCreditAmount: {
            $sum: {
              $cond: [
                {
                  $eq: ["$type", "credit"],
                },
                "$amount",
                0,
              ],
            },
          },

          totalDebitAmount: {
            $sum: {
              $cond: [
                {
                  $eq: ["$type", "debit"],
                },
                "$amount",
                0,
              ],
            },
          },

          totalCreditCount: {
            $sum: {
              $cond: [
                {
                  $eq: ["$type", "credit"],
                },
                1,
                0,
              ],
            },
          },

          totalDebitCount: {
            $sum: {
              $cond: [
                {
                  $eq: ["$type", "debit"],
                },
                1,
                0,
              ],
            },
          },
        },
      },

      {
        $project: {
          _id: 0,

          totalTransactions: 1,

          totalCreditAmount: 1,
          totalDebitAmount: 1,

          totalCreditCount: 1,
          totalDebitCount: 1,
        },
      },
    ]);

    const result = stats[0] || {
      totalTransactions: 0,

      totalCreditAmount: 0,
      totalDebitAmount: 0,

      totalCreditCount: 0,
      totalDebitCount: 0,
    };

    // =========================
    // FORMAT AMOUNTS
    // =========================

    result.totalCreditAmount = paiseToRupee(result.totalCreditAmount || 0);

    result.totalDebitAmount = paiseToRupee(result.totalDebitAmount || 0);

    return res.status(200).json({
      success: true,
      message: "Wallet ledger stats fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
