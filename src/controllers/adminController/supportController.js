const Support = require("../../models/supportModel");

exports.getSupportStats = async (req, res, next) => {
    try {
        const stats = await Support.aggregate([
            {
                $match: {
                    isDeleted: false,
                }
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                }
            }
        ])

        const total = await Support.countDocuments({ isDeleted: false });

        return res.status(200).json({
            success: true,
            message: "Support stats fetched successfully",
            data: stats,
            total,
        });
    } catch (error) {
        next(error);
    }
}

exports.getSupportRequests = async (req, res, next) => {
    try {
        let { page = 1, limit = 10, status = "", search = "" } = req.query;
        page = Number(page)
        limit = Number(limit)
        status = status?.trim().toLowerCase();
        search = search?.trim().toLowerCase();

        const skip = (page - 1) * limit;

        const filter = {
            isDeleted: false,
        }

        if (status) {
            filter.status = status;
        }

        if (search) {
            filter.$or = [
                { ticketId: { $regex: search, $options: "i" } },
            ]
        }

        const supportRequests = await Support.aggregate([
            {
                $match: filter
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user"
                }
            },
            {
                $unwind: {
                    path: "$user",
                    preserveNullAndEmptyArrays: true,
                }
            },
            {
                $addFields: {
                    "fullName": { $concat: ["$user.firstName", " ", "$user.lastName"] }
                }
            },
            {
                $project: {
                    ticketId: 1,
                    fullName: 1,
                    supportDetails: 1,
                    status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                }
            },
            {
                $sort: {
                    createdAt: -1,
                }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        ])

        const total = await Support.countDocuments(filter);

        return res.status(200).json({
            success: true,
            message: "Support requests fetched successfully",
            data: supportRequests,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                total: total,
            }
        });
    } catch (error) {
        next(error);
    }
}