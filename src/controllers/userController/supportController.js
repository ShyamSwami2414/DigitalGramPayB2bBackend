const Support = require("../../models/supportModel");
const mongoose = require("mongoose");
const Service = require("../../models/serviceModel");

exports.createSupportRequest = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { serviceId, supportDetails, transactionId } = req.body;
        const requiredFields = ["serviceId", "supportDetails"];
        const missingFields = [];

        requiredFields.forEach(field => {
            if (!req.body[field]) {
                missingFields.push(field);
            }
        })

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(", ")}`,
            });
        }

        if(!mongoose.Types.ObjectId.isValid(serviceId)){
            return res.status(400).json({
                success: false,
                message: "Invalid serviceId",
            });
        }

        const service = await Service.findById(serviceId);
        if(!service){
            return res.status(404).json({
                success: false,
                message: "Service not found",
            });
        }

        const support = new Support({
            userId,
            serviceId,
            transactionId,
            supportDetails,
        });

        await support.save();

        return res.status(201).json({
            success: true,
            message: "Support request created successfully",
            data: support,
        });
    } catch (error) {
        next(error);
    }
}