const UserWhitelistAccount = require("../../models/userWhitelistAccountModel");
const User = require("../../models/userModel");
const mongoose = require("mongoose");

exports.getAccountWhitelistRequest = async (req, res, next) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      userId = "",
      status = "",
      from = "",
      to = "",
      range = "",
    } = req.query;
    page = Number(page);
    limit = Number(limit);
    search = search?.trim().toLowerCase();
    userId = userId?.trim();
    status = status?.trim().toLowerCase();

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
      // status: "pending",
      isActive: true,
      isDeleted: false,
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

    const result = await UserWhitelistAccount.aggregate([
      {
        $match: filter, //  same as find(filter)
      },
      {
        $lookup: {
          from: "users", //  collection name (not model name)
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true, // optional
        },
      },

      ...(search
        ? [
            {
              $match: {
                $or: [
                  { firstName: { $regex: search, $options: "i" } },
                  { lastName: { $regex: search, $options: "i" } },
                  { email: { $regex: search, $options: "i" } },
                  { phone: { $regex: search, $options: "i" } },
                  { userName: { $regex: search, $options: "i" } },

                  // lookup fields
                  { ifscCode: { $regex: search, $options: "i" } },
                  { accountNumber: { $regex: search, $options: "i" } },
                  { parentUser: { $regex: search, $options: "i" } },
                 
                  { parentUserName: { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),

      {
        $project: {
          // keep all fields + only selected user fields

          userId: "$user._id",
          name: "$user.name",
          email: "$user.email",
          phone: "$user.phone",
          userName: "$user.userName",
          // include other fields you want
          accountNumber: 1,
          ifscCode: 1,
          accountHolderName: 1,
          bankName: 1,
          createdAt: 1,
          status: 1,
          chequeImageUrl: 1,
          passbookOrBankStatementUrl: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
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
              $count: "total",
            },
          ],
        },
      },
    ]);

    const accountWhitelistRequests = result[0]?.data;
    const total = result[0]?.totalCount[0]?.total || 0;

    if (!accountWhitelistRequests) {
      return res.status(200).json({
        success: true,
        message: "Account whitelist requests not found",
        data: [],
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          total: total,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "Account whitelist requests fetched successfully",
      data: accountWhitelistRequests,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.approveRejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { status, reason } = req.body;
    status = status?.trim().toLowerCase();
    reason = reason?.trim();

    const requiredFields = ["status"];
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

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Account whitelist request ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account whitelist request ID",
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    if (status === "rejected" && !reason) {
      return res.status(400).json({
        success: false,
        message: "Reason is required",
      });
    }

    const accountWhitelistRequest = await UserWhitelistAccount.findOneAndUpdate(
      {
        _id: id,
        status: "pending",
      },
      {
        $set: {
          status,
          reason,
        },
      },
      { new: true },
    );

    if (!accountWhitelistRequest) {
      return res.status(404).json({
        success: false,
        message: "Account whitelist request not found or already processed",
      });
    }

    res.status(200).json({
      success: true,
      message: `Account whitelist request ${status} successfully`,
    });
  } catch (error) {
    next(error);
  }
};
