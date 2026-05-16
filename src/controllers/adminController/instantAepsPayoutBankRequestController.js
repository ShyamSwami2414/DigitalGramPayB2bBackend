const AepsPayoutBank = require("../../models/sozoAepsPayoutBankRequestModel");
const User = require("../../models/userModel");
const mongoose = require("mongoose");

exports.aepsPayoutBankRequests = async (req, res, next) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      status,
      userId = "",
      from = "",
      to = "",
      range = "",
    } = req.query;
    page = Number(page);
    limit = Number(limit);
    search = search?.trim();
    userId = userId?.trim();
    status = status?.trim()?.toLowerCase();

    from = typeof from === "string" ? from.trim() : "";
    to = typeof to === "string" ? to.trim() : "";
    range = typeof range === "string" ? range?.trim().toLowerCase() : "";

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
      isDeleted: false,
      // status: "pending",
    };

    const skip = (page - 1) * limit;

    const now = new Date();
    let fromDate, toDate;

    const allowedStatus = ["approved", "rejected", "pending"];
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

    const result = await AepsPayoutBank.aggregate([
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
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { bankName: { $regex: search, $options: "i" } },
                  {
                    accountHolderName: {
                      $regex: search,
                      $options: "i",
                    },
                  },
                  {
                    accountNumber: {
                      $regex: search,
                      $options: "i",
                    },
                  },
                  {
                    ifscCode: {
                      $regex: search,
                      $options: "i",
                    },
                  },

                  // lookup fields
                  {
                    fullName: {
                      $regex: search,
                      $options: "i",
                    },
                  },
                  {
                    userName: {
                      $regex: search,
                      $options: "i",
                    },
                  },
                ],
              },
            },
          ]
        : []),
      {
        $project: {
          bankName: 1,
          fullName: 1,
          userName: 1,
          accountHolderName: 1,
          accountNumber: 1,
          ifscCode: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          chequeUrl: 1,
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

    const payoutBankRequests = result[0]?.data || [];

    const total = result[0]?.totalCount?.[0]?.count || 0;

    return res.status(200).json({
      success: true,
      message: "Payout bank requests fetched successfully",
      data: payoutBankRequests,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalRequests: total,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.approveRejectAepsPayoutBankRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { status } = req.body;
    status = status?.trim()?.toLowerCase();

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Bank ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Bank ID",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const payoutBankRequest = await AepsPayoutBank.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        isDeleted: false,
        status: "pending",
      },
      {
        $set: {
          status: status,
        },
      },
      { new: true },
    );

    if (!payoutBankRequest) {
      return res.status(404).json({
        success: false,
        message: "Payout bank request not found or already approved/rejected",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        status === "approved"
          ? "Payout bank request approved"
          : "Payout bank request rejected",
      data: payoutBankRequest,
    });
  } catch (error) {
    next(error);
  }
};
