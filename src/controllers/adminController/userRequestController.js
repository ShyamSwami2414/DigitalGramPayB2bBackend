const UserRequest = require("../../models/userRequestModel");
const Role = require("../../models/roleModel");
const mongoose = require("mongoose");

exports.getAllUserRequests = async (req, res) => {
    try {
        let { page = 1, limit = 10 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        const skip = (page - 1) * limit;
        const filter = { isDeleted: false };

        if (isNaN(page) || isNaN(limit) || page <= 0 || limit <= 0) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid page or limit" });
        }

        const userRequests = await UserRequest.aggregate([
            { $match: filter },

            {
                $lookup: {
                    from: "roles",
                    localField: "roleId",
                    foreignField: "_id",
                    as: "roleData",
                },
            },

            {
                $unwind: {
                    path: "$roleData",
                    preserveNullAndEmptyArrays: true,
                },
            },

            {
                $addFields: {
                    role: "$roleData.name",
                },
            },

            {
                $lookup: {
                    from: "users",
                    localField: "parentUserId",
                    foreignField: "_id",
                    as: "parentUserData",
                },
            },

            {
                $unwind: {
                    path: "$parentUserData",
                    preserveNullAndEmptyArrays: true,
                },
            },

            // Add new field "role"
            {
                $addFields: {
                    parentUser: {
                        $concat: [
                            "$parentUserData.firstName",
                            " ",
                            "$parentUserData.lastName"
                        ]
                    }
                },
            },

            {
                $project: {
                    parentUserData: 0,
                    parentUserId: 0,
                    roleId: 0,
                    roleData: 0,
                },
            },

            { $sort: { createdAt: -1 } },

            { $skip: skip },
            { $limit: limit },
        ]);

        const total = await UserRequest.countDocuments(filter);

        return res.status(200).json({
            success: true,
            message: "User Requests fetched successfully",
            data: userRequests,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        return res
            .status(500)
            .json({ success: false, message: "Internal Server Error" });
    }
};

exports.updateUserRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        let { status = "", reason = "" } = req.body;
        status = status?.toLowerCase().trim();
        reason = reason?.trim();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid User Id Provided" });
        }

        if (!status) {
            return res
                .status(400)
                .json({ success: false, message: "Status is required" });
        }

        if (status === "rejected" && !reason) {
            return res
                .status(400)
                .json({ success: false, message: "Rejection reason is required" });
        }

        if (!["approved", "rejected"].includes(status.toLowerCase())) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid status" });
        }

        const existingUserRequest = await UserRequest.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!existingUserRequest) {
            return res
                .status(404)
                .json({ success: false, message: "User Request not found" });
        }

        existingUserRequest.status = status;
        existingUserRequest.rejectionReason = reason;
        await existingUserRequest.save();

        return res.status(200).json({
            success: true,
            message: "User Request status updated successfully",
            data: existingUserRequest,
        });
    } catch (error) {
        console.error("Error updating user request status:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
