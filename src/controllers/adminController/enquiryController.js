const Enquiry = require("../../models/enquiryModel");

exports.getEnquiries = async (req, res, next) => {
    try {
        let { page = 1, limit = 10, search = "" } = req.query;
        page = Number(page);
        limit = Number(limit);
        search = search?.trim().toLowerCase();

        const skip = (page - 1) * limit
        const filter = {
            isDeleted: false,
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
                { message: { $regex: search, $options: "i" } },
            ]
        }

        const enquiries = await Enquiry.
            find(filter).
            sort({ createdAt: -1 }).
            skip(skip).
            limit(limit);

        const total = await Enquiry.countDocuments(filter);
        return res.status(200).json({
            success: true,
            message: "Enquiries fetched successfully",
            data: enquiries,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                total,
            }
        });
    } catch (error) {
        next(error);
    }
}