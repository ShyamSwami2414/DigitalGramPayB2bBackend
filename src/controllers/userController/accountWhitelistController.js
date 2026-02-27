const UserWhitelistAccount = require("../../models/userWhitelistAccountModel");

exports.getAccountWhitelist = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const accountWhitelists = await UserWhitelistAccount.find({ userId });

        if (accountWhitelists.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No Whitelist Account Found",
                data: [],
            });
        }

        res.status(200).json({
            success: true,
            message: "Whitelist Account Found Successfully",
            data: accountWhitelists,
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


