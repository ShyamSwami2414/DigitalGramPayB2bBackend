const mongoose = require("mongoose");
const Field = require("../../models/fieldModel");
const Document = require("../../models/documentModel");
const OfflineService = require("../../models/offlineServiceModel");

exports.listAllOfflineServices = async (req, res, next) => {
    try {
        let { page = 1, limit = 10 } = req.query
        page = Number(page)
        limit = Number(limit)

        const skip = (page - 1) * limit;

        const offlineServices = await OfflineService.aggregate([
            { $match: {} },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        ])

        const total = await OfflineService.countDocuments()

        return res.status(200).json({
            success: true,
            message: "Offline Service Fetched Successfully ",
            data: offlineServices,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        next(error)

    }
}

exports.createOfflineService = async (req, res, next) => {
    try {
        let { serviceName, amount, description, requiredFields, requiredDocuments } = req.body;

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

        console.log(!Array.isArray(requiredFields))
        console.log(requiredFields.length === 0)

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
            (id) => !mongoose.Types.ObjectId.isValid(id)
        );

        const invalidDocumentIds = requiredDocuments.filter(
            (id) => !mongoose.Types.ObjectId.isValid(id)
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
            amount,
            requiredFields,
            requiredDocuments,
            description,
            serviceImageUrl: `/uploads/offlineServices/${offlineServiceImage}`
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