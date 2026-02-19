const LoginLog = require("../../models/loginLogs");

exports.getLoginLogs = async (req, res) => {
    try {
        let { page = 1, limit = 10 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        const skip = (page - 1) * limit;

        const loginLogs = await LoginLog.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "userData"
                }
            },
            {
                $unwind: {
                    path: "$userData",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    user: {
                        $concat: [
                            "$userData.firstName",
                            " ",
                            "$userData.lastName"
                        ]
                    }
                }

            },
            {
                $project: {
                    userData: 0,
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        ]);

        const total = await LoginLog.countDocuments({});

        return res.status(200).json({
            success: true,
            message: "Login Logs fetched successfully",
            data: loginLogs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}