const OfflineServiceRequest = require("../../models/offlineServiceRequestModel");
const mongoose = require("mongoose");

exports.listOfflineServiceRequests = async (req, res, next) => {
  try {
    let { page = 1, limit = 10, search = "", status = "" } = req.query;
    page = Number(page);
    limit = Number(limit);
    search = search?.trim();
    status = status?.trim().toLowerCase();

    const skip = (page - 1) * limit;
    const filter = { isDeleted: false };

    if (status) {
      filter.status = status;
    }

    const offlineServiceRequests = await OfflineServiceRequest.aggregate([
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
        },
      },
      {
        $lookup: {
          from: "offlineservices",
          localField: "offlineServiceId",
          foreignField: "_id",
          as: "offlineService",
        },
      },
      {
        $unwind: {
          path: "$offlineService",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          serviceName: "$offlineService.serviceName",
        },
      },
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { serviceName: { $regex: search, $options: "i" } },
                  { fullName: { $regex: search, $options: "i" } },
                  { userName: { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),
      {
        $project: {
          userId: 0,
          user: 0,
          fieldData: 0,
          documentData: 0,
          offlineServiceId: 0,
          offlineService: 0,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const total = await OfflineServiceRequest.countDocuments();

    return res.status(200).json({
      success: true,
      message: "Offline Service Request Fetched Successfully ",
      data: offlineServiceRequests,
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

exports.getOfflineServiceRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Request ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    const filter = {
      _id: new mongoose.Types.ObjectId(id),
      isDeleted: false,
    };

    const [offlineServiceRequest] = await OfflineServiceRequest.aggregate([
      { $match: filter },

      // 🔹 Lookup Fields
      {
        $lookup: {
          from: "fields",
          localField: "fieldData.fieldId",
          foreignField: "_id",
          as: "fieldsData",
        },
      },

      // 🔹 Lookup Documents
      {
        $lookup: {
          from: "documents",
          localField: "documentData.documentId",
          foreignField: "_id",
          as: "documentsData",
        },
      },

      // 🔹 Map fieldData with key & label
      {
        $addFields: {
          fieldData: {
            $map: {
              input: "$fieldData",
              as: "fd",
              in: {
                fieldId: "$$fd.fieldId",
                value: "$$fd.value",
                key: {
                  $let: {
                    vars: {
                      matched: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$fieldsData",
                              as: "f",
                              cond: {
                                $eq: ["$$f._id", "$$fd.fieldId"],
                              },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: "$$matched.key",
                  },
                },
                label: {
                  $let: {
                    vars: {
                      matched: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$fieldsData",
                              as: "f",
                              cond: {
                                $eq: ["$$f._id", "$$fd.fieldId"],
                              },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: "$$matched.label",
                  },
                },
              },
            },
          },

          // 🔹 Map documentData with key & label
          documentData: {
            $map: {
              input: "$documentData",
              as: "dd",
              in: {
                documentId: "$$dd.documentId",
                fileUrl: "$$dd.fileUrl",
                key: {
                  $let: {
                    vars: {
                      matched: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$documentsData",
                              as: "d",
                              cond: {
                                $eq: ["$$d._id", "$$dd.documentId"],
                              },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: "$$matched.key",
                  },
                },
                label: {
                  $let: {
                    vars: {
                      matched: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$documentsData",
                              as: "d",
                              cond: {
                                $eq: ["$$d._id", "$$dd.documentId"],
                              },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: "$$matched.label",
                  },
                },
              },
            },
          },
        },
      },

      // 🔹 Remove unnecessary lookup arrays
      {
        $project: {
          fieldsData: 0,
          documentsData: 0,
        },
      },
    ]);

    if (!offlineServiceRequest) {
      return res.status(404).json({
        success: false,
        message: "Offline Service Request Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offline Service Request Fetched Successfully",
      data: offlineServiceRequest,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteOfflineServiceRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Request ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    const filter = {
      _id: new mongoose.Types.ObjectId(id),
      isDeleted: false,
    };

    const offlineServiceRequest = await OfflineServiceRequest.findOneAndUpdate(
      filter,
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      },
      {
        new: true,
      },
    );

    if (!offlineServiceRequest) {
      return res.status(404).json({
        success: false,
        message: "Offline Service Request Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offline Service Request Deleted Successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.updateOfflineServiceRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { status, remark } = req.body;

    status = status?.trim().toLowerCase();

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Request ID is required",
      });
    }

    if (!status || !remark) {
      return res.status(400).json({
        success: false,
        message: "Status and Remark are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    if (!["processing", "completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Status",
      });
    }

    const offlineServiceRequest = await OfflineServiceRequest.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
      },
      {
        $set: {
          status: status,
          adminRemark: remark,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!offlineServiceRequest) {
      return res.status(404).json({
        success: false,
        message: "Offline Service Request Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offline Service Request Status Updated Successfully",
    });
  } catch (error) {
    next(error);
  }
};
