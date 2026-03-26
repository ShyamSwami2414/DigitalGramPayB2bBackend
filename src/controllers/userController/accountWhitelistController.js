const UserWhitelistAccount = require("../../models/userWhitelistAccountModel");
const mongoose = require("mongoose");

exports.getAccountWhitelist = async (req, res, next) => {
  try {
    let {
      page = 1,
      limit = 10,
      status = "",
      from = "",
      to = "",
      range = "",
      search = "",
    } = req.query;

    console.log(req.query, "query");

    page = Number(page);
    limit = Number(limit);
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

    const result = await UserWhitelistAccount.aggregate([
      {
        $match: filter,
      },

      {
        $facet: {
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
          ],

          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const data = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    res.status(200).json({
      success: true,
      success: true,
      message:
        data.length > 0
          ? "Whitelist Account Found Successfully"
          : "No Whitelist Account Found",
      data,
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

exports.addAccountWhitelist = async (req, res, next) => {
  try {
    const { accountNumber, ifscCode, bankName, accountHolderName } = req.body;
    const userId = req.user.id;

    const chequeImageUrl = req?.files?.chequeImage?.[0]?.filename;
    const passbookOrBankStatementUrl =
      req?.files?.passbookOrBankStatement?.[0]?.filename;

    const requiredFields = [
      "accountNumber",
      "ifscCode",
      "bankName",
      "accountHolderName",
    ];
    const missingFields = [];

    requiredFields.forEach((field) => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${missingFields.join(", ")} is required`,
      });
    }

    if (!chequeImageUrl) {
      return res.status(400).json({
        success: false,
        message: "Cheque image is required",
      });
    }

    if (!passbookOrBankStatementUrl) {
      return res.status(400).json({
        success: false,
        message: "Passbook or bank statement is required",
      });
    }

    const accountWhitelist = new UserWhitelistAccount({
      userId,
      accountNumber,
      ifscCode,
      bankName,
      accountHolderName,
      chequeImageUrl: `/uploads/accountWhitelist/${chequeImageUrl}`,
      passbookOrBankStatementUrl: `/uploads/accountWhitelist/${passbookOrBankStatementUrl}`,
    });

    await accountWhitelist.save();
    res.status(201).json({
      success: true,
      message: "Account whitelist added successfully",
      data: accountWhitelist,
    });
  } catch (error) {
    next(error);
  }
};
