const mongoose = require("mongoose");
const Role = require("../../models/roleModel");
const { rupeeToPaise, paiseToRupee } = require("../../utils/money");
const IdCharge = require("../../models/idChargeRequest");
const User = require("../../models/userModel");
const UserWallet = require("../../models/userWallet");
const WalletLedger = require("../../models/walletLedgerModel");
const {
  generateIdChargeEmail,
} = require("../../templates/emailTemplates/idChargRejectApproveTemplate");
const { sendEmail } = require("../../utils/email");

exports.getOnBoardCharges = async (req, res, next) => {
  try {
    const charges = await Role.aggregate([
      { $match: { isActive: true, isDeleted: false } },
      { $project: { name: 1, onBoardCharge: 1, isPaymentRequired: 1 } },
    ]);

    const formattedData = charges.map((item) => ({
      ...item,
      onBoardCharge: paiseToRupee(item?.onBoardCharge),
    }));

    return res.status(200).json({
      success: true,
      message: "Charges fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.setOnBoardCharges = async (req, res, next) => {
  try {
    console.log(req.body, "body");
    let { role, amount, isPaymentRequired } = req.body;

    amount = Number(amount);

    const amountInPaise = rupeeToPaise(amount);

    if (!role || !amount || isPaymentRequired === null) {
      return res
        .status(400)
        .json({ success: false, message: "All Details is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(role)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Role ID" });
    }

    const newRole = await Role.findOneAndUpdate(
      { _id: role, isDeleted: false },
      {
        $set: {
          onBoardCharge: amountInPaise, //paise
          isPaymentRequired: isPaymentRequired,
        },
      },
      { new: true },
    );

    if (!newRole) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Charges Set Successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCharge = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { amount } = req.body;

    amount = Number(amount);

    const amountInPaise = rupeeToPaise(amount);

    if (!id) {
      return res.status(400).json({ success: false, message: "ID Missing" });
    }

    if (!amount) {
      return res
        .status(400)
        .json({ success: false, message: "Amount Missing" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const charge = await Role.findOneAndUpdate(
      {
        _id: id,
        isActive: true,
        isDeleted: false,
      },
      {
        $set: {
          onBoardCharge: amountInPaise,
        },
      },
      {
        new: true,
      },
    );

    if (!charge) {
      return res
        .status(404)
        .json({ success: false, message: "Charge Data Not Found" });
    }

    return res.status(200).json({ success: true, message: "Charges Updated" });
  } catch (error) {
    next(error);
  }
};

exports.togglePaymentRequired = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: "ID Missing" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const charge = await Role.findOne({
      _id: id,
      isDeleted: false,
      isActive: true,
    });

    if (!charge) {
      return res
        .status(404)
        .json({ success: false, message: "Charge Not found" });
    }

    charge.isPaymentRequired = !charge.isPaymentRequired;
    await charge.save();

    return res
      .status(200)
      .json({ success: true, message: "Updated Successfully" });
  } catch (error) {
    next(error);
  }
};

exports.getAllIdChargeRequest = async (req, res, next) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      user = "",
      status = "",
      from = "",
      to = "",
      range = "",
    } = req.query;
    console.log(req.query, "");

    page = Number(page);
    limit = Number(limit);
    search = search?.trim().toLowerCase();
    user = user?.trim();
    status = status?.trim().toLowerCase();

    from = typeof from === "string" ? from.trim().toLowerCase() : "";
    to = typeof to === "string" ? to.trim().toLowerCase() : "";
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

    const filter = {};
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

    if (search) {
      const isNumber = !isNaN(search);

      filter.$or = [
        { referenceId: { $regex: search, $options: "i" } },
        { mode: { $regex: search, $options: "i" } },
        { utrNumber: { $regex: search, $options: "i" } },
        { rejectionReason: { $regex: search, $options: "i" } },

        ...(isNumber ? [{ amount: Number(search) }] : []),
      ];
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

    console.log(filter, "filter");

    const idChargeRequest = await IdCharge.aggregate([
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
          fullName: {
            $concat: ["$user.firstName", " ", "$user.lastName"],
          },
          userName: "$user.userName",
        },
      },
      {
        $project: {
          user: 0,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    console.log(IdCharge, "idChargeRequest");

    const total = await IdCharge.countDocuments(filter);

    const formattedData = idChargeRequest.map((item) => ({
      ...item,
      amount: paiseToRupee(item?.amount),
    }));

    return res.status(200).json({
      success: true,
      message: "ID charge requests fetched successfully",
      data: formattedData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.approveIdChargeRequest = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;
    let openingBalance = 0;
    let closingBalance = 0;

    if (!id) {
      const err = new Error("Invalid onboard charge request ID");
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid onboard charge ID");
      err.statusCode = 400;
      throw err;
    }

    const idChargeRequest = await IdCharge.findOneAndUpdate(
      {
        _id: id,
        status: "pending",
      },
      {
        $set: {
          status: "approved",
        },
      },
      {
        new: true,
        session,
      },
    );

    if (!idChargeRequest) {
      const err = new Error("Request already processed or not found");
      err.statusCode = 400;
      throw err;
    }

    const requestUser = await User.findOneAndUpdate(
      {
        _id: idChargeRequest.userId,
        isDeleted: false,
      },
      { $set: { isPaymentDone: true, idPaymentStatus: "approved" } },
      { session },
    );

    if (!requestUser) {
      const err = new Error("User not found");
      err.statusCode = 400;
      throw err;
    }

    // const wallet = await UserWallet.findOneAndUpdate(
    //   {
    //     userId: fundRequest.userId,
    //     isDeleted: false,
    //   },
    //   {
    //     $inc: { mainWallet: fundRequest.amount },
    //   },
    //   { new: true, session },
    // );

    // if (!wallet) {
    //   const err = new Error("User wallet not found");
    //   err.statusCode = 400;
    //   throw err;
    // }

    // closingBalance = wallet.mainWallet;
    // openingBalance = closingBalance - fundRequest.amount;

    // await WalletLedger.create(
    //   [
    //     {
    //       userId: fundRequest.userId,
    //       serviceType: "FUNDREQUEST",
    //       referenceId: fundRequest?.referenceId,
    //       wallet: "main",
    //       type: "credit",
    //       amount: fundRequest.amount,
    //       openingBalance: openingBalance,
    //       closingBalance: closingBalance,

    //       description: "Fund request approved",
    //     },
    //   ],
    //   { session },
    // );

    await session.commitTransaction();

    const html = generateIdChargeEmail({
      name: requestUser?.firstName,
      status: "Approved",
      amount: paiseToRupee(idChargeRequest?.amount),
    });

    await sendEmail(
      requestUser.email,
      "",
      "",
      "ID Charge Payment Request Approved",
      html,
    );

    const formattedData = idChargeRequest
      ? {
          ...idChargeRequest?._doc,
          amount: paiseToRupee(idChargeRequest?.amount),
        }
      : null;

    return res.status(200).json({
      success: true,
      message: "Request approved successfully",
      data: formattedData,
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

exports.rejectIdChargeRequest = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;
    let { rejectionReason } = req.body;
    rejectionReason = rejectionReason?.trim();

    if (!id) {
      const err = new Error("Onboard charge request ID is required");
      err.statusCode = 400;
      throw err;
    }

    if (!rejectionReason) {
      const err = new Error("Rejection reason is required");
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid Onboard charge request ID");
      err.statusCode = 400;
      throw err;
    }

    const idChargeRequest = await IdCharge.findOneAndUpdate(
      {
        _id: id,
        status: "pending",
      },
      {
        $set: {
          status: "rejected",
          rejectionReason: rejectionReason,
          rejectedAt: new Date(),
        },
      },
      {
        new: true,
        session,
      },
    );

    if (!idChargeRequest) {
      const err = new Error("Request already processed or not found");
      err.statusCode = 400;
      throw err;
    }

    const requestUser = await User.findOneAndUpdate(
      {
        _id: idChargeRequest.userId,
        isDeleted: false,
      },
      { $set: { idPaymentStatus: "rejected" } },
      { session },
    );

    if (!requestUser) {
      const err = new Error("User not found");
      err.statusCode = 400;
      throw err;
    }

    await session.commitTransaction();

    const html = generateIdChargeEmail({
      name: requestUser?.firstName,
      status: "Rejected",
      reason: rejectionReason,
      amount: paiseToRupee(idChargeRequest?.amount),
    });

    await sendEmail(
      requestUser.email,
      "",
      "",
      `ID Charge Payment Request Rejected because ${rejectionReason}`,
      html,
    );

    const formattedData = idChargeRequest
      ? {
          ...idChargeRequest?.doc,
          amount: paiseToRupee(idChargeRequest?.amount),
        }
      : null;

    return res.status(200).json({
      success: true,
      message: "Request rejected successfully",
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
