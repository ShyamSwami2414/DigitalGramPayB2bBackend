
const mongoose = require("mongoose");
const Field = require("../../models/fieldModel");
const Document = require("../../models/documentModel");
const OfflineService = require("../../models/offlineServiceModel");

exports.listAllOfflineServices = async (req, res, next) => {
    try {

        const offlineServices = await OfflineService.find();

        return res.status(200).json({
            success: true,
            message: "Offline Service Fetched Successfully ",
            data: offlineServices
        });

    } catch (error) {
        next(error)

    }

}

exports.getFormByServiceId = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Offline Service ID is Required",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Offline Service ID",
            });
        }

        const offlineService = await OfflineService.aggregate([
            { $match: {} },
            {
                $lookup: {
                    from: "fields",
                    localField: "requiredFields",
                    foreignField: "_id",
                    as: "fields"
                }
            },
            {
                $unwind: {
                    path: "$fields",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "documents",
                    localField: "requiredDocuments",
                    foreignField: "_id",
                    as: "documents"
                }
            },
            {
                $unwind: {
                    path: "$documents",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    requiredFields: 0,
                    requiredDocuments: 0
                }
            }
        ])

        if (!offlineService) {
            return res.status(404).json({
                success: false,
                message: "Offline Service Not Found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Offline Service Fetched Successfully ",
            data: offlineService
        });

    } catch (error) {
        next(error)

    }
}

