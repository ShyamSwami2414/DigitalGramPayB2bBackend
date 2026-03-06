const OfflineServiceRequest = require("../../models/offlineServiceRequestModel");
const OfflineService = require("../../models/offlineServiceModel");
const mongoose = require("mongoose");

exports.createOfflineServiceRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let { offlineServiceId, fieldData } = req.body;

    if (
      !offlineServiceId ||
      !mongoose.Types.ObjectId.isValid(offlineServiceId)
    ) {
      return res.status(400).json({ message: "Invalid Offline Service ID" });
    }

    if (typeof fieldData === "string") {
      fieldData = JSON.parse(fieldData);
    }

    if (!Array.isArray(fieldData) || fieldData.length === 0) {
      return res.status(400).json({ message: "FieldData required" });
    }

    const offlineService = await OfflineService.findOne({
      _id: offlineServiceId,
      isDeleted: false,
    });

    if (!offlineService) {
      return res.status(404).json({ message: "Offline Service not found" });
    }

    const requiredFieldIds = offlineService.requiredFields.map((id) =>
      id.toString(),
    );
    const requiredDocumentIds = offlineService.requiredDocuments.map((id) =>
      id.toString(),
    );

    const submittedFieldIds = fieldData.map((f) => f.fieldId);

    // Duplicate field check
    if (new Set(submittedFieldIds).size !== submittedFieldIds.length) {
      return res.status(400).json({ message: "Duplicate fields submitted" });
    }

    // Validate fields
    for (let f of fieldData) {
      if (!f.fieldId || !mongoose.Types.ObjectId.isValid(f.fieldId)) {
        return res.status(400).json({ message: "Invalid fieldId" });
      }

      if (!requiredFieldIds.includes(f.fieldId)) {
        return res.status(400).json({ message: "Invalid field submitted" });
      }

      if (!f.value || f.value.toString().trim() === "") {
        return res.status(400).json({ message: "Field value cannot be empty" });
      }
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Documents required" });
    }

    const uploadedDocumentIds = req.files.map((f) => f.fieldname);

    // Duplicate document check
    if (new Set(uploadedDocumentIds).size !== uploadedDocumentIds.length) {
      return res.status(400).json({ message: "Duplicate documents uploaded" });
    }

    // Validate documents
    for (let docId of uploadedDocumentIds) {
      if (!requiredDocumentIds.includes(docId)) {
        return res.status(400).json({ message: "Invalid document uploaded" });
      }
    }

    for (let id of requiredDocumentIds) {
      if (!uploadedDocumentIds.includes(id)) {
        return res.status(400).json({ message: "Missing required documents" });
      }
    }

    const documentData = req.files.map((file) => ({
      documentId: file.fieldname,
      fileUrl: `/uploads/offlineServiceRequest/${file.filename}`,
    }));

    const newRequest = await OfflineServiceRequest.create({
      userId,
      offlineServiceId,
      fieldData,
      documentData,
    });

    res.status(201).json({
      success: true,
      data: newRequest,
    });
  } catch (error) {
    next(error);
  }
};

exports.listOfflineServiceRequests = async (req, res, next) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    let userId = req.user.id;
    page = Number(page);
    limit = Number(limit);

    const skip = (page - 1) * limit;

    const offlineServiceRequests = await OfflineServiceRequest.aggregate([
      {
        $match: {
          isDeleted: false,
          userId: new mongoose.Types.ObjectId(userId),
        },
      },
      // {
      //     $lookup: {
      //         from: "users",
      //         localField: "userId",
      //         foreignField: "_id",
      //         as: "user"
      //     }
      // },
      // {
      //     $unwind: {
      //         path: "$user",
      //         preserveNullAndEmptyArrays: true
      //     }
      // },
      // {
      //     $addFields: {
      //         fullName: {
      //             $concat: ["$user.firstName", " ", "$user.lastName"]
      //         }
      //     }
      // },
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

    const total = await OfflineServiceRequest.countDocuments({
      isDeleted: false,
      userId: new mongoose.Types.ObjectId(userId),
    });

    return res.status(200).json({
      success: true,
      message: "Offline Service Request Fetched Successfully",
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
    let userId = req.user.id;

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
      userId: new mongoose.Types.ObjectId(userId),
    };

    const [offlineServiceRequest] = await OfflineServiceRequest.aggregate([
      { $match: filter },

      // 🔹 Lookup Fields
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
          offlineService: 0,
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
