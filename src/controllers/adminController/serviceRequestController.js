const mongoose = require("mongoose");
const Role = require("../../models/roleModel");
const ServiceRequest = require("../../models/serviceRequestModel");
const User = require("../../models/userModel");

exports.listAllServiceRequest = async (req, res, next) => {
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

    const serviceRequest = await ServiceRequest.aggregate([
      { $match: filter },

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
          email: "$user.email",
          phone: "$user.phone",
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
        $unwind: {
          path: "$service",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $addFields: {
          serviceName: "$service.name",
        },
      },

      {
        $project: {
          user: 0,
          service: 0,
          rejectionReason: 0,
          isDeletedAt: 0,
          updatedAt: 0,
          isActive: 0,
          isDeleted: 0,
        },
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

    console.log(JSON.stringify(serviceRequest, null, 2), "serviceRequest");

    const data = serviceRequest[0]?.data || [];
    const total = serviceRequest[0]?.totalCount?.[0]?.count || 0;

    return res.status(200).json({
      success: true,
      message: "Service requests fetched successfully",
      data: data,
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

// exports.approveIdChargeRequest = async (req, res, next) => {
//   const session = await mongoose.startSession();

//   try {
//     session.startTransaction();

//     const { id } = req.params;
//     let openingBalance = 0;
//     let closingBalance = 0;

//     if (!id) {
//       const err = new Error("Invalid onboard charge request ID");
//       err.statusCode = 400;
//       throw err;
//     }

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       const err = new Error("Invalid onboard charge ID");
//       err.statusCode = 400;
//       throw err;
//     }

//     const idChargeRequest = await IdCharge.findOneAndUpdate(
//       {
//         _id: id,
//         status: "pending",
//       },
//       {
//         $set: {
//           status: "approved",
//         },
//       },
//       {
//         new: true,
//         session,
//       },
//     );

//     if (!idChargeRequest) {
//       const err = new Error("Request already processed or not found");
//       err.statusCode = 400;
//       throw err;
//     }

//     const requestUser = await User.findOneAndUpdate(
//       {
//         _id: idChargeRequest.userId,
//         isDeleted: false,
//       },
//       { $set: { isPaymentDone: true, idPaymentStatus: "approved" } },
//       { session },
//     );

//     if (!requestUser) {
//       const err = new Error("User not found");
//       err.statusCode = 400;
//       throw err;
//     }

//     // const wallet = await UserWallet.findOneAndUpdate(
//     //   {
//     //     userId: fundRequest.userId,
//     //     isDeleted: false,
//     //   },
//     //   {
//     //     $inc: { mainWallet: fundRequest.amount },
//     //   },
//     //   { new: true, session },
//     // );

//     // if (!wallet) {
//     //   const err = new Error("User wallet not found");
//     //   err.statusCode = 400;
//     //   throw err;
//     // }

//     // closingBalance = wallet.mainWallet;
//     // openingBalance = closingBalance - fundRequest.amount;

//     // await WalletLedger.create(
//     //   [
//     //     {
//     //       userId: fundRequest.userId,
//     //       serviceType: "FUNDREQUEST",
//     //       referenceId: fundRequest?.referenceId,
//     //       wallet: "main",
//     //       type: "credit",
//     //       amount: fundRequest.amount,
//     //       openingBalance: openingBalance,
//     //       closingBalance: closingBalance,

//     //       description: "Fund request approved",
//     //     },
//     //   ],
//     //   { session },
//     // );

//     await session.commitTransaction();

//     const html = generateIdChargeEmail({
//       name: requestUser?.firstName,
//       status: "Approved",
//       amount: paiseToRupee(idChargeRequest?.amount),
//     });

//     await sendEmail(
//       requestUser.email,
//       "",
//       "",
//       "ID Charge Payment Request Approved",
//       html,
//     );

//     const formattedData = idChargeRequest
//       ? {
//           ...idChargeRequest?._doc,
//           amount: paiseToRupee(idChargeRequest?.amount),
//         }
//       : null;

//     return res.status(200).json({
//       success: true,
//       message: "Request approved successfully",
//       data: formattedData,
//     });
//   } catch (error) {
//     if (session.inTransaction()) {
//       await session.abortTransaction();
//     }

//     next(error);
//   } finally {
//     session.endSession();
//   }
// };

// exports.rejectIdChargeRequest = async (req, res, next) => {
//   const session = await mongoose.startSession();

//   try {
//     session.startTransaction();

//     const { id } = req.params;
//     let { rejectionReason } = req.body;
//     rejectionReason = rejectionReason?.trim();

//     if (!id) {
//       const err = new Error("Onboard charge request ID is required");
//       err.statusCode = 400;
//       throw err;
//     }

//     if (!rejectionReason) {
//       const err = new Error("Rejection reason is required");
//       err.statusCode = 400;
//       throw err;
//     }

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       const err = new Error("Invalid Onboard charge request ID");
//       err.statusCode = 400;
//       throw err;
//     }

//     const idChargeRequest = await IdCharge.findOneAndUpdate(
//       {
//         _id: id,
//         status: "pending",
//       },
//       {
//         $set: {
//           status: "rejected",
//           rejectionReason: rejectionReason,
//           rejectedAt: new Date(),
//         },
//       },
//       {
//         new: true,
//         session,
//       },
//     );

//     if (!idChargeRequest) {
//       const err = new Error("Request already processed or not found");
//       err.statusCode = 400;
//       throw err;
//     }

//     const requestUser = await User.findOneAndUpdate(
//       {
//         _id: idChargeRequest.userId,
//         isDeleted: false,
//       },
//       { $set: { idPaymentStatus: "rejected" } },
//       { session },
//     );

//     if (!requestUser) {
//       const err = new Error("User not found");
//       err.statusCode = 400;
//       throw err;
//     }

//     await session.commitTransaction();

//     const html = generateIdChargeEmail({
//       name: requestUser?.firstName,
//       status: "Rejected",
//       reason: rejectionReason,
//       amount: paiseToRupee(idChargeRequest?.amount),
//     });

//     await sendEmail(
//       requestUser.email,
//       "",
//       "",
//       `ID Charge Payment Request Rejected because ${rejectionReason}`,
//       html,
//     );

//     const formattedData = idChargeRequest
//       ? {
//           ...idChargeRequest?.doc,
//           amount: paiseToRupee(idChargeRequest?.amount),
//         }
//       : null;

//     return res.status(200).json({
//       success: true,
//       message: "Request rejected successfully",
//     });
//   } catch (error) {
//     if (session.inTransaction()) {
//       await session.abortTransaction();
//     }
//     next(error);
//   } finally {
//     session.endSession();
//   }
// };
