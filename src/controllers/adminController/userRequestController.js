const UserRequest = require("../../models/userRequestModel");
const User = require("../../models/userModel");
const Role = require("../../models/roleModel");
const mongoose = require("mongoose");
const { generateUniquePin } = require("../../utils/uniquePinGenerator");
const { generateUsername } = require("../../utils/generateUsername");
const { generateUserPassword } = require("../../utils/generateUserPassword");
const { hashPassword } = require("../../utils/bcrypt");
const { generateWelcomeEmail } = require("../../templates/emailTemplates/welcomeEmail");
const { sendEmail } = require("../../utils/email");
const { generateRejectionEmail } = require("../../templates/emailTemplates/userRequestRejectionEmail");


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
    const session = await mongoose.startSession()
    try {
        session.startTransaction();
        const { id } = req.params;
        let { status = "", reason = "" } = req.body;
        status = status?.toLowerCase().trim();
        reason = reason?.trim();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            session.endSession();
            return res
                .status(400)
                .json({ success: false, message: "Invalid User Id Provided" });
        }

        if (!status) {
            await session.abortTransaction();
            session.endSession();
            return res
                .status(400)
                .json({ success: false, message: "Status is required" });
        }

        if (status === "rejected" && !reason) {
            await session.abortTransaction();
            session.endSession();
            return res
                .status(400)
                .json({ success: false, message: "Rejection reason is required" });
        }

        if (!["approved", "rejected"].includes(status.toLowerCase())) {
            await session.abortTransaction();
            session.endSession();
            return res
                .status(400)
                .json({ success: false, message: "Invalid status" });
        }

        const existingUserRequest = await UserRequest.findOne({
            _id: id,
            isDeleted: false,
        }).populate("roleId", "level");

        if (!existingUserRequest) {
            await session.abortTransaction();
            session.endSession();
            return res
                .status(404)
                .json({ success: false, message: "User Request not found" });
        }

        if (existingUserRequest.status === "approved" || existingUserRequest.status === "rejected") {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "User request already approved or rejected",
            });
        }

        existingUserRequest.status = status;
        existingUserRequest.rejectionReason = reason;
        await existingUserRequest.save();

        if (status === "approved") {
            const pin = generateUniquePin();
            const userName = await generateUsername();
            const password = await generateUserPassword();

            const hashedPassword = await hashPassword(password);

            const newUser = new User({
                firstName: existingUserRequest.firstName,
                lastName: existingUserRequest.lastName,
                userName: userName,
                phone: existingUserRequest.phone,
                roleId: existingUserRequest.roleId,
                email: existingUserRequest.email,
                pin: pin,
                password: hashedPassword,
                level: existingUserRequest.roleId.level
            });

            await newUser.save({ session });

            await session.commitTransaction();
            session.endSession();

            const html = generateWelcomeEmail({
                name: existingUserRequest.firstName + " " + existingUserRequest.lastName,
                email: existingUserRequest.email,
                userName: userName,
                password,
                pin,
                loginUrl: "http://localhost:8000/user-login",
            });

            sendEmail(existingUserRequest.email, [], [], "Welcome to Camlenio Software", html);


            return res
                .status(201)
                .json({ success: true, message: "User registered successfully" });
        }

        if (status === "rejected") {
            await session.commitTransaction();
            session.endSession();
            const html = generateRejectionEmail({
                name: existingUserRequest.firstName + " " + existingUserRequest.lastName,
                email: existingUserRequest.email,
                reason: reason,
            });

            sendEmail(existingUserRequest.email, [], [], "User Request Rejected", html);

            return res.status(200).json({
                success: true,
                message: "Request rejected successfully",
            });
        }

        // return res.status(200).json({
        //     success: true,
        //     message: "User Request status updated successfully",
        //     data: existingUserRequest,
        // });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error("Error updating user request status:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
