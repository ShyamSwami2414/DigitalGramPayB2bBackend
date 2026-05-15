const WalletLedger = require("../../models/walletLedgerModel");
const { paiseToRupee } = require("../../utils/money");
const mongoose = require("mongoose");
const User = require("../../models/userModel");
const Service = require("../../models/serviceModel");

exports.completeCommissionReport = async (req, res, next) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      userId = "",
      status = "",
      service = "",
      from = "",
      to = "",
      range = "",
    } = req.query;

    console.log(req.query, "query");

    page = Number(page);
    limit = Number(limit);
    search = search?.trim();
    status = status?.trim().toLowerCase();

    range = typeof range === "string" ? range?.trim().toLowerCase() : "";
    from = typeof from === "string" ? from.trim().toLowerCase() : "";
    to = typeof to === "string" ? to.trim().toLowerCase() : "";

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
    const filter = { entryType: "COMMISSION" };
    const now = new Date();
    let fromDate, toDate;

    const allowedStatus = ["success", "failed", "pending"];
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

    if (service) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
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

      // filter.service = new mongoose.Types.ObjectId(userId);
    }

    console.log(filter, "filter");
    const isNumber = /^\d+(\.\d+)?$/.test(search);
    const result = await WalletLedger.aggregate([
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
      ...(search
        ? [
            {
              $match: {
                $or: [
                  {
                    referenceId: {
                      $regex: search,
                      $options: "i",
                    },
                  },

                  {
                    serviceType: {
                      $regex: search,
                      $options: "i",
                    },
                  },

                  {
                    "user.userName": {
                      $regex: search,
                      $options: "i",
                    },
                  },

                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $concat: ["$user.firstName", " ", "$user.lastName"],
                        },
                        regex: search,
                        options: "i",
                      },
                    },
                  },

                  ...(isNumber ? [{ amount: Number(search) }] : []),
                ],
              },
            },
          ]
        : []),
      {
        $project: {
          fullName: { $concat: ["$user.firstName", " ", "$user.lastName"] },
          userName: "$user.userName",
          email: "$user.email",
          phone: "$user.phone",
          serviceType: 1,
          wallet: 1,
          type: 1,
          amount: 1,
          openingBalance: 1,
          closingBalance: 1,
          referenceId: 1,
          description: 1,
          createdAt: 1,
        },
      },

      {
        $sort: {
          createdAt: -1,
        },
      },

      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],

          totalCount: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    const data = result[0]?.data || [];

    const totalCount = result[0]?.totalCount[0]?.count || 0;

    if (data.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No Data available",
        data: [],
      });
    }

    const formattedData = data.map((item) => ({
      ...item,
      amount: paiseToRupee(item?.amount),
      openingBalance: paiseToRupee(item?.openingBalance),
      closingBalance: paiseToRupee(item?.closingBalance),
    }));

    return res.status(200).json({
      success: true,
      message: "Report Found",
      data: formattedData,

      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};
