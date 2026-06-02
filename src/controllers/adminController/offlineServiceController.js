const mongoose = require("mongoose");
const Field = require("../../models/fieldModel");
const Document = require("../../models/documentModel");
const OfflineService = require("../../models/offlineServiceModel");
const { rupeeToPaise, paiseToRupee } = require("../../utils/money");

exports.getOfflineServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "ID Required" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "ID Required" });
    }

    const filter = { _id: new mongoose.Types.ObjectId(id), isDeleted: false };

    const [offlineService] = await OfflineService.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "fields",
          localField: "requiredFields",
          foreignField: "_id",
          as: "requiredFields",
        },
      },

      {
        $lookup: {
          from: "documents",
          localField: "requiredDocuments",
          foreignField: "_id",
          as: "requiredDocuments",
        },
      },

      {
        $project: {
          _id: 1,
          serviceName: 1,
          amount: 1,
          description: 1,
          serviceImageUrl: 1,
          requiredFields: 1,
          requiredDocuments: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    const total = await OfflineService.countDocuments();

    const formattedData = offlineService
      ? { ...offlineService, amount: paiseToRupee(offlineService.amount) }
      : null;

    return res.status(200).json({
      success: true,
      message: "Offline Service Fetched Successfully ",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.listAllOfflineServices = async (req, res, next) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;
    page = Number(page);
    limit = Number(limit);
    search = search?.trim();

    const skip = (page - 1) * limit;

    const result = await OfflineService.aggregate([
      { $match: { isDeleted: false } },
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { serviceName: { $regex: search, $options: "i" } },
                  { amount: { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),
      { $sort: { createdAt: -1 } },

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

    const offlineServices = result[0]?.data || [];
    const total = result[0]?.totalCount?.[0]?.count || 0;

    const formattedData = offlineServices.map((item) => ({
      ...item,
      amount: paiseToRupee(item.amount),
    }));

    return res.status(200).json({
      success: true,
      message: "Offline Service Fetched Successfully ",
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

exports.createOfflineService = async (req, res, next) => {
  try {
    let {
      serviceName,
      amount,
      description,
      requiredFields,
      requiredDocuments,
    } = req.body;

    const offlineServiceImage = req.file.filename;

    console.log(requiredFields, "requiredFields");
    console.log(requiredDocuments, "requiredDocuments");

    if (typeof requiredFields === "string") {
      requiredFields = JSON.parse(requiredFields);
    }

    if (typeof requiredDocuments === "string") {
      requiredDocuments = JSON.parse(requiredDocuments);
    }

    // -----------------------
    // Basic Validation
    // -----------------------

    if (!serviceName || amount === undefined || !description) {
      return res.status(400).json({
        success: false,
        message: "Service name, description, and amount are required",
      });
    }

    serviceName = serviceName.trim().toLowerCase();
    amount = Number(amount);

    if (Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a valid positive number",
      });
    }

    const amountInPaise = rupeeToPaise(amount);

    console.log(!Array.isArray(requiredFields));
    console.log(requiredFields.length === 0);

    if (!Array.isArray(requiredFields) || requiredFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one required field is mandatory",
      });
    }

    if (!Array.isArray(requiredDocuments) || requiredDocuments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one required document is mandatory",
      });
    }

    // -----------------------
    // ObjectId Validation
    // -----------------------

    const invalidFieldIds = requiredFields.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id),
    );

    const invalidDocumentIds = requiredDocuments.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id),
    );

    if (invalidFieldIds.length || invalidDocumentIds.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid field/document ID detected",
      });
    }

    // -----------------------
    // Check duplicate service
    // -----------------------

    const existingService = await OfflineService.findOne({
      serviceName,
    });

    if (existingService) {
      return res.status(409).json({
        success: false,
        message: "Service already exists",
      });
    }

    // -----------------------
    // Verify Fields Exist
    // -----------------------

    const fieldsCount = await Field.countDocuments({
      _id: { $in: requiredFields },
    });

    if (fieldsCount !== requiredFields.length) {
      return res.status(400).json({
        success: false,
        message: "Some required fields are invalid or inactive",
      });
    }

    // -----------------------
    // Verify Documents Exist
    // -----------------------

    const documentsCount = await Document.countDocuments({
      _id: { $in: requiredDocuments },
    });

    if (documentsCount !== requiredDocuments.length) {
      return res.status(400).json({
        success: false,
        message: "Some required documents are invalid or inactive",
      });
    }

    // -----------------------
    // Create Service
    // -----------------------

    const newService = await OfflineService.create({
      serviceName,
      amount: amountInPaise,
      requiredFields,
      requiredDocuments,
      description,
      serviceImageUrl: `/uploads/offlineServices/${offlineServiceImage}`,
    });

    return res.status(201).json({
      success: true,
      message: "Offline Service Created Successfully",
      data: newService,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateOfflineService = async (req, res, next) => {
  try {
    const { id } = req.params;
    let {
      serviceName,
      amount,
      description,
      requiredFields,
      requiredDocuments,
    } = req.body;

    if (requiredFields) {
      if (typeof requiredFields === "string") {
        try {
          requiredFields = JSON.parse(requiredFields);
        } catch (err) {
          return res.status(400).json({
            success: false,
            message: "Invalid requiredFields format",
          });
        }
      }
    }

    if (requiredDocuments) {
      if (typeof requiredDocuments === "string") {
        try {
          requiredDocuments = JSON.parse(requiredDocuments);
        } catch (err) {
          return res.status(400).json({
            success: false,
            message: "Invalid requiredDocuments format",
          });
        }
      }
    }

    // -----------------------
    // Basic Required Validation
    // -----------------------

    if (!id) {
      return res.status(400).json({ success: false, message: "ID Required" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    if (!serviceName || amount === undefined || !description) {
      return res.status(400).json({
        success: false,
        message: "Service name, description, and amount are required",
      });
    }

    if (!Array.isArray(requiredFields) || requiredFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one required field is mandatory",
      });
    }

    if (!Array.isArray(requiredDocuments) || requiredDocuments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one required document is mandatory",
      });
    }
    // -----------------------
    // Check Service Exists
    // -----------------------
    const existingService = await OfflineService.findById(id);
    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: "Offline service not found",
      });
    }

    // -----------------------
    // Parse JSON (FormData case)
    // -----------------------
    if (typeof requiredFields === "string") {
      requiredFields = JSON.parse(requiredFields);
    }

    if (typeof requiredDocuments === "string") {
      requiredDocuments = JSON.parse(requiredDocuments);
    }

    // -----------------------
    // Format & Validate
    // -----------------------
    serviceName = serviceName.trim().toLowerCase();
    amount = Number(amount);

    if (Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a valid positive number",
      });
    }

    const amountInPaise = rupeeToPaise(amount);

    // -----------------------
    // Duplicate Check (Exclude Current)
    // -----------------------
    const duplicateService = await OfflineService.findOne({
      serviceName,
      _id: { $ne: id },
    });

    if (duplicateService) {
      return res.status(409).json({
        success: false,
        message: "Service name already exists",
      });
    }

    // -----------------------
    // Validate ObjectIds
    // -----------------------
    const invalidFieldIds = requiredFields.filter(
      (fieldId) => !mongoose.Types.ObjectId.isValid(fieldId),
    );

    const invalidDocumentIds = requiredDocuments.filter(
      (docId) => !mongoose.Types.ObjectId.isValid(docId),
    );

    if (invalidFieldIds.length || invalidDocumentIds.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid field/document ID detected",
      });
    }

    // -----------------------
    // Verify Fields Exist
    // -----------------------
    const fieldsCount = await Field.countDocuments({
      _id: { $in: requiredFields },
    });

    if (fieldsCount !== requiredFields.length) {
      return res.status(400).json({
        success: false,
        message: "Some required fields are invalid or inactive",
      });
    }

    // -----------------------
    // Verify Documents Exist
    // -----------------------
    const documentsCount = await Document.countDocuments({
      _id: { $in: requiredDocuments },
    });

    if (documentsCount !== requiredDocuments.length) {
      return res.status(400).json({
        success: false,
        message: "Some required documents are invalid or inactive",
      });
    }

    // -----------------------
    // Image Handling
    // -----------------------

    let imageUrl = existingService.serviceImageUrl;

    if (req.file) {
      imageUrl = `/uploads/offlineServices/${req.file.filename}`;
    }

    // If you want image mandatory on update, uncomment below:
    /*
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Service image is required",
            });
        }
        */

    // -----------------------
    // Update Service
    // -----------------------
    const updatedService = await OfflineService.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
      },
      {
        serviceName,
        amount: amountInPaise,
        description,
        requiredFields,
        requiredDocuments,
        serviceImageUrl: imageUrl,
      },
      { new: true },
    );

    if (!updatedService) {
      return res.status(400).json({
        success: false,
        message: "Offline Service Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offline Service Updated Successfully",
      data: updatedService,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteOfflineService = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: "ID Required" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const deleted = await OfflineService.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: "Offline Service Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offline Service Deleted Successfully",
    });
  } catch (error) {
    next(error);
  }
};
