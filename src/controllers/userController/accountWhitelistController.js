const UserWhitelistAccount = require("../../models/userWhitelistAccountModel");

exports.getAccountWhitelist = async (req, res, next) => {
    try {
        let { page = 1, limit = 10 } = req.query
        page = Number(page);
        limit = Number(limit);

        const skip = (page - 1) * limit;

        const userId = req.user.id;
        const accountWhitelists = await UserWhitelistAccount.
            find({ userId }).
            skip(skip).
            limit(limit).
            sort({ createdAt: -1 });

        if (accountWhitelists.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No Whitelist Account Found",
                data: [],
            });
        }

        const total = await UserWhitelistAccount.countDocuments({ userId })

        res.status(200).json({
            success: true,
            message: "Whitelist Account Found Successfully",
            data: accountWhitelists,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        next(error);
    }
}

exports.addAccountWhitelist = async (req, res, next) => {
    try {
        const { accountNumber, ifscCode, bankName, accountHolderName } = req.body;
        const userId = req.user.id;

        const chequeImageUrl = req?.files?.chequeImage?.[0]?.filename;
        const passbookOrBankStatementUrl = req?.files?.passbookOrBankStatement?.[0]?.filename;

        const requiredFields = ["accountNumber", "ifscCode", "bankName", "accountHolderName",];
        const missingFields = [];

        requiredFields.forEach((field) => {
            if (!req.body[field]) {
                missingFields.push(field);
            }
        });

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `${missingFields.join(", ")} is required`,
            });
        }


        if (!chequeImageUrl) {
            return res.status(400).json({
                success: false,
                message: "Cheque image is required",
            });
        }

        if (!passbookOrBankStatementUrl) {
            return res.status(400).json({
                success: false,
                message: "Passbook or bank statement is required",
            });
        }

        const accountWhitelist = new UserWhitelistAccount({
            userId,
            accountNumber,
            ifscCode,
            bankName,
            accountHolderName,
            chequeImageUrl: `/uploads/accountWhitelist/${chequeImageUrl}`,
            passbookOrBankStatementUrl: `/uploads/accountWhitelist/${passbookOrBankStatementUrl}`,
        });

        await accountWhitelist.save();
        res.status(201).json({
            success: true,
            message: "Account whitelist added successfully",
            data: accountWhitelist,
        });
    } catch (error) {
        next(error);
    }
}


