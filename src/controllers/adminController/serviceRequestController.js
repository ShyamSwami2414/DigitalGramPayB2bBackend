const mongoose = require("mongoose");
const Role = require("../../models/roleModel");
const ServiceRequest = require("../../models/serviceRequestModel");
const User = require("../../models/userModel");
const { sendEmail } = require("../../utils/email");

exports.listAllServiceRequest = async (req, res, next) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      user = "",
      status = "",
      service = "",
      from = "",
      to = "",
      range = "",
    } = req.query;
    console.log(req.query, "");

    page = Number(page);
    limit = Number(limit);
    search = search?.trim();
    user = user?.trim();
    status = status?.trim().toLowerCase();
    service = service?.trim();

    from = typeof from === "string" ? from.trim() : "";
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

    if (service) {
      filter.serviceId = new mongoose.Types.ObjectId(service);
    }

    const now = new Date();
    let fromDate, toDate;

    const allowedStatus = ["approved", "assigned", "rejected", "pending"];
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
          userName: "$user.userName",
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

      ...(search
        ? [
            {
              $match: {
                $or: [
                  { firstName: { $regex: search, $options: "i" } },
                  { lastName: { $regex: search, $options: "i" } },
                  { fullName: { $regex: search, $options: "i" } },
                  { email: { $regex: search, $options: "i" } },
                  { phone: { $regex: search, $options: "i" } },
                  { userName: { $regex: search, $options: "i" } },
                  {
                    serviceName: {
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
          user: 0,
          service: 0,
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

exports.approveServiceRequest = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;
    let openingBalance = 0;
    let closingBalance = 0;

    if (!id) {
      const err = new Error("Invalid service request ID");
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid service request ID");
      err.statusCode = 400;
      throw err;
    }

    const serviceRequest = await ServiceRequest.findOneAndUpdate(
      {
        _id: id,
        status: "pending",
      },
      {
        $set: {
          status: "assigned",
        },
      },
      {
        new: true,
        session: session,
      },
    );

    if (!serviceRequest) {
      const err = new Error("Request already processed or not found");
      err.statusCode = 400;
      throw err;
    }

    const result = await User.updateOne(
      {
        _id: serviceRequest.userId,
        isDeleted: false,
        "assignedServices.serviceId": serviceRequest.serviceId,
      },
      {
        $addToSet: {
          "assignedServices.$.pipelineCodes": serviceRequest.pipelineCode,
        },
      },
      { session },
    );

    let requestUser;
    if (result.matchedCount === 0) {
      requestUser = await User.findOneAndUpdate(
        {
          _id: serviceRequest.userId,
          isDeleted: false,
        },
        {
          $push: {
            assignedServices: {
              serviceId: serviceRequest.serviceId,
              pipelineCodes: [serviceRequest.pipelineCode],
            },
          },
        },
        { new: true, session },
      );

      if (!requestUser) {
        const err = new Error("User not found");
        err.statusCode = 400;
        throw err;
      }
    } else {
      //  fetch user when service already exists
      requestUser = await User.findById(serviceRequest.userId).session(session);
    }

    await session.commitTransaction();

    const html =
      "Your Service Request is Approved, please proceed with transactions";

    await sendEmail(
      requestUser.email,
      "",
      "",
      "Service Request Approved",
      html,
    );

    const formattedData = serviceRequest
      ? {
          ...serviceRequest?._doc,
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

exports.rejectServiceRequest = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;
    let { rejectionReason } = req.body;

    rejectionReason = rejectionReason?.trim();

    //  Validation
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid service request ID");
      err.statusCode = 400;
      throw err;
    }

    if (!rejectionReason) {
      const err = new Error("Rejection reason is required");
      err.statusCode = 400;
      throw err;
    }

    //  Reject request
    const serviceRequest = await ServiceRequest.findOneAndUpdate(
      {
        _id: id,
        status: "pending",
      },
      {
        $set: {
          status: "rejected",
          rejectionReason,
          rejectedAt: new Date(),
        },
      },
      {
        new: true,
        session: session,
      },
    );

    if (!serviceRequest) {
      const err = new Error("Request already processed or not found");
      err.statusCode = 400;
      throw err;
    }

    let requestUser = await User.findOne({
      _id: serviceRequest.userId,
      isActive: true,
      isDeleted: false,
    })
      .select("email")
      .lean();

    if (!requestUser) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    await session.commitTransaction();

    const html = " Your Service Request has been Rejected";

    await sendEmail(
      requestUser.email,
      "",
      "",
      `Service Request Rejected`,
      html,
    );

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
