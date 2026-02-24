const Service = require("../../models/serviceModel");

exports.getServiceList = async (req, res, next) => {
    try {
        const services = await Service.find({
            isActive: true,
            isDeleted: false,
        });
        return res.status(200).json({
            success: true,
            message: "Services fetched successfully",
            data: services,
        });
    } catch (error) {
        next(error);
    }
}