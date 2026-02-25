const WalletLedger = require("../../models/walletLedgerModel");

exports.aepsToEwalletHistory = async (req, res, next) => {
    try {
        let { page = 1, limit = 10, search = '' } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        search = search.trim();
        const skip = (page - 1) * limit;

        const filter = {
            wallet: "aeps",
            type: "debit"
        }

        if (search) {
            filter.$or = [
                {
                    openingBalance: {
                        $regex: search,
                        $options: "i",
                    }
                },

                {
                    closingBalance: {
                        $regex: search,
                        $options: "i",
                    }
                },
                {
                    referenceId: {
                        $regex: search,
                        $options: "i",
                    }
                }
            ]
        }


        const walletTransferHistory = await WalletLedger.aggregate([
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
                $unwind: "$user"
            },
            {
                $addFields: {
                    fullName: { $concat: ["$user.firstName", " ", "$user.lastName"] }
                }
            },
            {
                $project: {
                    userId: 1,
                    fullName: 1,
                    wallet: 1,
                    type: 1,
                    amount: 1,
                    openingBalance: 1,
                    closingBalance: 1,
                    description: 1,
                    referenceId: 1,
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
                $skip: skip,
            },
            {
                $limit: limit,
            }
        ])

        return res.status(200).json({
            success: true,
            message: "Wallet transfer history fetched successfully",
            data: walletTransferHistory,
        });
    } catch (error) {
        next(error);
    }
}
