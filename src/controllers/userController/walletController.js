const mongoose = require("mongoose");
const UserWallet = require("../../models/userWallet");
const User = require("../../models/userModel");

exports.getWalletBalance = async (req, res, next) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
        }

        const userExist = await User.findOne({
            _id: new mongoose.Types.ObjectId(userId),
            isActive: true,
            isDeleted: false,
        })

        if (!userExist) {
            return res.status(400).json({
                success: false,
                message: "User not found or not active"
            });
        }

        const userWallet = await UserWallet.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    isActive: true,
                    isDeleted: false,
                }
            },
            {
                $project: {
                    userId: 1,
                    aepsWallet: 1,
                    mainWallet: 1,
                    aepsHoldAmount: 1,
                    mainHoldAmount: 1
                }
            }
        ])

        return res.status(200).json({
            success: true,
            message: "User wallet fetched successfully",
            data: userWallet,
        });
    } catch (error) {
        next(error);
    }
}
