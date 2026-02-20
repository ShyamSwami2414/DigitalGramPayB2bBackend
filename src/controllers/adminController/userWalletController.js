const mongoose = require("mongoose");
const UserWallet = require("../../models/userWallet");

exports.getAllUserWallet = async (req, res, next) => {
    try {
        let { page = 1, limit = 10 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        const skip = (page - 1) * limit;
        const filter = { isDeleted: false };

        const userWallets = await UserWallet.aggregate([
            { $match: filter },
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
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    userName: { $concat: ["$user.firstName", " ", "$user.lastName"] },
                    phone: "$user.phone"
                }
            },
            {
                $project: {
                    user: 0,
                    createdAt: 0,
                    updatedAt: 0,
                    deletedAt: 0
                }
            },
            { $skip: skip },
            { $limit: limit }
        ])

        const total = await UserWallet.countDocuments(filter);

        return res.status(200).json({
            success: true,
            data: userWallets,
            pagination: {
                page,
                limit,
                total: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
}

exports.holdReleaseAmount = async (req, res, next) => {
    try {
        let { userId, amount, walletType, type, reason } = req.body;
        amount = Number(amount);

        type = type?.trim().toLowerCase();
        walletType = walletType?.trim().toLowerCase();
        reason = reason?.trim();

        const requiredFields = ["userId", "amount", "type", "walletType"]
        const missingField = [];

        requiredFields.forEach(field => {
            if (!req.body[field]) {
                missingField.push(field);
            }
        })

        if (missingField.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing fields: ${missingField.join(", ")}`
            });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }


        if (!Number.isFinite(amount)) {
            return res.status(400).json({ message: "Invalid amount" });
        }

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than 0"
            });
        }

        if (!["hold", "release"].includes(type)) {
            return res.status(400).json({ message: "Invalid type" });
        }

        if (!["aeps", "main"].includes(walletType)) {
            return res.status(400).json({ message: "Invalid wallet type" });
        }

        const field = walletType === "aeps" ? "aepsHoldAmount" : "mainHoldAmount";
        const updatedValue = type === "hold" ? amount : -amount;

        const query =
            type === "release"
                ? {
                    userId: new mongoose.Types.ObjectId(userId),
                    [field]: { $gte: amount },
                    isActive: true,
                    isDeleted: false,
                }
                : {
                    userId: new mongoose.Types.ObjectId(userId),
                    isActive: true,
                    isDeleted: false,
                };


        let updateData = { $inc: { [field]: updatedValue } };

        // save reason only when HOLD
        if (type === "hold" && reason) {
            const reasonField =
                walletType === "aeps" ? "aepsHoldReason" : "mainHoldReason";

            updateData.$set = { [reasonField]: reason };
        }

        const updatedUserWallet = await UserWallet.findOneAndUpdate(
            query,
            updateData,
            { new: true }
        );

        if (!updatedUserWallet) {
            return res.status(400).json({
                success: false,
                message:
                    type === "release"
                        ? "Insufficient hold balance"
                        : "Wallet not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: `Amount ${type}ed successfully`,
            data: updatedUserWallet
        });
    } catch (error) {
        next(error);
    }
}