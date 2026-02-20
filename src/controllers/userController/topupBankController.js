const WalletTopupBankModel = require("../../models/walletTopupBankModel");

exports.getAllTopupBanks = async (req, res, next) => {
    try {
        const topupBanks = await WalletTopupBankModel.find(
            {
                isActive: true,
                isDeleted: false
            }).
            sort({ createdAt: -1 }).
            lean();

        res.status(200).
            json({
                success: true,
                data: topupBanks
            });

    } catch (error) {
        next(error);
    }
}