const OfflineServiceRequest = require("../../models/offlineServiceRequestModel");
const OfflineService = require("../../models/offlineServiceModel");
const User = require("../../models/userModel");
const UserWallet = require("../../models/userWallet");
const WalletLedger = require("../../models/walletLedgerModel");
const mongoose = require("mongoose");
const { rupeeToPaise, paiseToRupee } = require("../../utils/money");
const { sendEmail } = require("../../utils/email");
const {
  generateUniqueRefernceId,
} = require("../../utils/generateUniqueReferenceId");

exports.createOfflineServiceRequest = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const userId = req.user.id;
    let { offlineServiceId, fieldData } = req.body;

    if (
      !offlineServiceId ||
      !mongoose.Types.ObjectId.isValid(offlineServiceId)
    ) {
      const err = new Error("Invalid Offline Service ID");
      err.statusCode = 400;
      throw err;
    }

    if (typeof fieldData === "string") {
      fieldData = JSON.parse(fieldData);
    }

    if (!Array.isArray(fieldData) || fieldData.length === 0) {
      const err = new Error("FieldData required");
      err.statusCode = 400;
      throw err;
    }

    const user = await User.findOne({
      _id: userId,
      isActive: true,
      isDeleted: false,
    })
      .select("email userName")
      .lean()
      .session(session);

    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    const offlineService = await OfflineService.findOne({
      _id: offlineServiceId,
      isDeleted: false,
    }).session(session);

    if (!offlineService) {
      const err = new Error("Offline Service not found");
      err.statusCode = 404;
      throw err;
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
      const err = new Error("Duplicate fields submitted");
      err.statusCode = 400;
      throw err;
    }

    // Validate fields
    for (let f of fieldData) {
      if (!f.fieldId || !mongoose.Types.ObjectId.isValid(f.fieldId)) {
        const err = new Error("Invalid fieldId");
        err.statusCode = 400;
        throw err;
      }

      if (!requiredFieldIds.includes(f.fieldId)) {
        const err = new Error("Invalid field submitted");
        err.statusCode = 400;
        throw err;
      }

      if (!f.value || f.value.toString().trim() === "") {
        const err = new Error("Field value cannot be empty");
        err.statusCode = 400;
        throw err;
      }
    }

    if (!req.files || req.files.length === 0) {
      const err = new Error("Documents required");
      err.statusCode = 400;
      throw err;
    }

    const uploadedDocumentIds = req.files.map((f) => f.fieldname);

    // Duplicate document check
    if (new Set(uploadedDocumentIds).size !== uploadedDocumentIds.length) {
      const err = new Error("Duplicate documents uploaded");
      err.statusCode = 400;
      throw err;
    }

    // Validate documents
    for (let docId of uploadedDocumentIds) {
      if (!requiredDocumentIds.includes(docId)) {
        const err = new Error("Invalid document uploaded");
        err.statusCode = 400;
        throw err;
      }
    }

    for (let id of requiredDocumentIds) {
      if (!uploadedDocumentIds.includes(id)) {
        const err = new Error("Missing required documents");
        err.statusCode = 400;
        throw err;
      }
    }

    const documentData = req.files.map((file) => ({
      documentId: file.fieldname,
      fileUrl: `/uploads/offlineServiceRequest/${file.filename}`,
    }));

    let openingBalance = 0;
    let closingBalance = 0;

    const query = {
      userId: userId,
      isDeleted: false,
      isActive: true,
      $expr: {
        $gte: [
          { $subtract: ["$mainWallet", "$mainHoldAmount"] },
          offlineService.amount,
        ],
      },
    };

    const updatedWallet = await UserWallet.findOneAndUpdate(
      query,
      {
        $inc: {
          mainWallet: -offlineService.amount,
        },
      },
      {
        session: session,
        new: true,
      },
    );

    if (!updatedWallet) {
      const err = new Error("Insufficient Wallet Balance, Contact to Admin");
      err.statusCode = 400;
      throw err;
    }

    closingBalance = updatedWallet.mainWallet;
    openingBalance = closingBalance + offlineService.amount;

    const referenceId = generateUniqueRefernceId("OSR");
    await WalletLedger.create(
      [
        {
          userId: userId,
          referenceId: referenceId,
          serviceType: "OFFLINE_SERVICE",
          entryType: "OFFLINE_SERVICE_REQUEST",
          wallet: "main",
          type: "debit",
          amount: offlineService.amount,
          openingBalance: openingBalance,
          closingBalance: closingBalance,
          description: "New Offline Service Request",
        },
      ],
      { session: session },
    );

    const newRequest = await OfflineServiceRequest.create(
      [
        {
          userId,
          offlineServiceId,
          amount: offlineService.amount,
          fieldData,
          documentData,
          status: "pending",
        },
      ],
      { session: session },
    );

    await session.commitTransaction();

    try {
      await sendEmail(
        user.email,
        [],
        [],
        "New Offline Service Request",
        `Your offline service request has been received, Will get it check by our team and get it processed as soon as possible.`,
      );
    } catch (emailError) {
      console.error("Email Send Failed:", emailError);
    }

    res.status(201).json({
      success: true,
      message: "Request Created Successfully",
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

exports.listOfflineServiceRequests = async (req, res, next) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;
    let userId = req.user.id;
    page = Number(page);
    limit = Number(limit);
    search = search?.trim();

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

      ...(search
        ? [
            {
              $match: {
                $or: [
                  { serviceName: { $regex: search, $options: "i" } },
                  { status: { $regex: search, $options: "i" } },
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

    const total = await OfflineServiceRequest.countDocuments({
      isDeleted: false,
      userId: new mongoose.Types.ObjectId(userId),
    });

    const formattedData =
      offlineServiceRequests &&
      offlineServiceRequests?.map((request) => ({
        ...request,
        amount: paiseToRupee(request?.amount),
      }));

    return res.status(200).json({
      success: true,
      message: "Offline Service Request Fetched Successfully",
      data: formattedData,
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
