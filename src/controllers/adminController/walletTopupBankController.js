const WalletTopupBank = require("../../models/walletTopupBankModel");

exports.getAllWalletTopupBanks = async (req, res) => {
    try {
        console.log(req.user, "user");
        const walletTopupBanks = await WalletTopupBank.find({
            adminId: req.user.id,
            isDeleted: false,
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Wallet topup banks fetched successfully",
            data: walletTopupBanks,
        });
    } catch (error) {
        console.error("Error fetching wallet topup banks:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
}

exports.addWalletTopupBank = async (req, res) => {
    try {
        const { bankName, accountNumber, ifscCode, accountHolderName } = req.body;
        const requiredFields = ["bankName", "accountNumber", "ifscCode", "accountHolderName"]

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

        const existingBank = await WalletTopupBank.findOne({
            accountNumber: accountNumber,
            isDeleted: false,
        });

        if (existingBank) {
            return res.status(400).json({
                success: false,
                message: "Bank already exists",
            });
        }

        const walletTopupBank = new WalletTopupBank({
            adminId: req.user.id,
            bankName,
            accountNumber,
            ifscCode,
            accountHolderName,
        });

        await walletTopupBank.save();

        return res.status(201).json({
            success: true,
            message: "Wallet topup bank added successfully",
            data: walletTopupBank,
        });
    } catch (error) {
        console.error("Error adding wallet topup bank:", error);
        if (error.name === "ValidationError") {
            const errors = Object.values(error.errors).map(err => err.message);

            return res.status(400).json({
                success: false,
                message: "Validation Error",
                errors
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Duplicate entry detected",
                field: Object.keys(error.keyValue)[0],
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}
