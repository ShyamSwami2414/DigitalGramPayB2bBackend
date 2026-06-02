const Document = require("../../models/documentModel");
const mongoose = require("mongoose");

exports.getAllDocumentOptionList = async (req, res, next) => {
  try {
    const documentList = await Document.find().select("key label");

    return res.status(200).json({
      success: true,
      message: "Document List Fetched",
      data: documentList,
    });
  } catch (error) {
    next(error);
  }
};

exports.createDocument = async (req, res, next) => {
  try {
    const { key, label, allowedTypes, maxSizeMB, isActive } = req.body;

    if (!key || !label) {
      return res.status(400).json({
        success: false,
        message: "Key and label are required",
      });
    }

    const normalizedKey = key?.trim().toLowerCase();

    const existingDocument = await Document.findOne({
      key: normalizedKey,
    }).lean();

    if (existingDocument) {
      return res.status(409).json({
        success: false,
        message: "Document key already exists",
      });
    }

    const document = await Document.create({
      key: normalizedKey,
      label: label.trim(),
      //   allowedTypes:
      //     Array.isArray(allowedTypes) && allowedTypes.length > 0
      //       ? allowedTypes
      //       : undefined,
      //   maxSizeMB,
      //   isActive,
    });

    return res.status(201).json({
      success: true,
      message: "Document created successfully",
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllDocuments = async (req, res, next) => {
  try {
    let { page = 1, limit = 10, search = "", isActive = "" } = req.query;

    page = Number(page);
    limit = Number(limit);
    search = search?.trim();

    if (isNaN(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid page number",
      });
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 100",
      });
    }

    const skip = (page - 1) * limit;

    const filter = {};

    if (isActive !== "") {
      filter.isActive = isActive === "true";
    }

    if (search) {
      filter.$or = [
        {
          key: {
            $regex: search,
            $options: "i",
          },
        },

        {
          label: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const result = await Document.aggregate([
      {
        $match: filter,
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

    const data = result?.[0]?.data || [];
    const total = result?.[0]?.totalCount?.[0]?.count || 0;

    return res.status(200).json({
      success: true,
      message: "Documents fetched successfully",
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

exports.getDocumentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID",
      });
    }

    const document = await Document.findById(id).lean();

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Document fetched successfully",
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID",
      });
    }

    const existingDocument = await Document.findById(id);

    if (!existingDocument) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    const { key, label, allowedTypes, maxSizeMB, isActive } = req.body;

    if (key) {
      const normalizedKey = key.trim().toLowerCase();

      const duplicateKey = await Document.findOne({
        key: normalizedKey,
        _id: {
          $ne: id,
        },
      }).lean();

      if (duplicateKey) {
        return res.status(409).json({
          success: false,
          message: "Document key already exists",
        });
      }

      existingDocument.key = normalizedKey;
    }

    if (label) {
      existingDocument.label = label.trim();
    }

    if (Array.isArray(allowedTypes)) {
      existingDocument.allowedTypes = allowedTypes;
    }

    if (maxSizeMB !== undefined) {
      existingDocument.maxSizeMB = maxSizeMB;
    }

    if (typeof isActive === "boolean") {
      existingDocument.isActive = isActive;
    }

    await existingDocument.save();

    return res.status(200).json({
      success: true,
      message: "Document updated successfully",
      data: existingDocument,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID",
      });
    }

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    await document.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
