const Enquiry = require("../../models/enquiryModel");

exports.createEnquiry = async (req, res, next) => {
    try {
        const { name, email, phone, project, message } = req.body;
        const requiredFields = ["name", "email", "phone", "message"];
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

        const enquiry = new Enquiry({
            name,
            email,
            phone,
            project: project || null,
            message,
        });

        await enquiry.save();

        return res.status(201).json({
            success: true,
            message: "Enquiry created successfully",
            data: enquiry,
        });
    } catch (error) {
        next(error);
    }
}