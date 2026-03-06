const OfflineServiceRequest = require("../../models/offlineServiceRequestModel");
const OfflineService = require("../../models/offlineServiceModel");
const mongoose = require("mongoose");

exports.createOfflineServiceRequest = async (req, res, next) => {
    try {
        const userId = req.user.id;
        let { offlineServiceId, fieldData } = req.body;

        if (!offlineServiceId || !mongoose.Types.ObjectId.isValid(offlineServiceId)) {
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
            isDeleted: false
        });

        if (!offlineService) {
            return res.status(404).json({ message: "Offline Service not found" });
        }

        const requiredFieldIds = offlineService.requiredFields.map(id => id.toString());
        const requiredDocumentIds = offlineService.requiredDocuments.map(id => id.toString());

        const submittedFieldIds = fieldData.map(f => f.fieldId);

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

        const uploadedDocumentIds = req.files.map(f => f.fieldname);

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

        const documentData = req.files.map(file => ({
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
            data: newRequest
        });

    } catch (error) {
        next(error);
    }
};