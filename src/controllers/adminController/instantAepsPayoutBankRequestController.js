const AepsPayoutBank = require("../../models/sozoAepsPayoutBankRequestModel");
const User = require("../../models/userModel");
const mongoose = require("mongoose");
const InstantAepsOutlet = require("../../models/instantAepsOutletModel");

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
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { id } = req.params;
    let { status } = req.body;
    status = status?.trim()?.toLowerCase();

    if (!id) {
      const err = new Error("Bank ID is required");
      err.status = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid Bank ID");
      err.status = 400;
      throw err;
    }

    if (!status) {
      const err = new Error("Status is required");
      err.status = 400;
      throw err;
    }

    if (!["approved", "rejected"].includes(status)) {
      const err = new Error("Invalid status");
      err.status = 400;
      throw err;
    }

    const payoutBank = await AepsPayoutBank.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isDeleted: false,
      status: "pending",
    }).session(session);

    if (!payoutBank) {
      const err = new Error("Payout Bank Request not found");
      err.status = 404;
      throw err;
    }

    const instantOutlet = await InstantAepsOutlet.findOne({
      userId: payoutBank.userId,
    })
      .select("aepsLimits aepsPayoutBanksAdded")
      .lean();

    if (!instantOutlet) {
      const err = new Error("Outlet not found");
      err.status = 404;
      throw err;
    }

    console.log(instantOutlet, "instantOutlet");

    if (
      instantOutlet?.aepsPayoutBanksAdded >=
      instantOutlet?.aepsLimits?.allowedBankLimits
    ) {
      const err = new Error(
        `Maximum account adding limit : ${instantOutlet?.aepsLimits?.allowedBankLimits}  `,
      );
      err.status = 400;
      throw err;
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
      { new: true, session: session },
    );

    if (!payoutBankRequest) {
      const err = new Error(
        "Payout bank request not found or already approved/rejected",
      );
      err.status = 404;
      throw err;
    }

    await InstantAepsOutlet.findOneAndUpdate(
      {
        userId: payoutBankRequest.userId,
      },
      { $inc: { aepsPayoutBanksAdded: 1 } },
      { session: session },
    );

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message:
        status === "approved"
          ? "Payout bank request approved"
          : "Payout bank request rejected",
      data: payoutBankRequest,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    session.endSession();
  }
};
