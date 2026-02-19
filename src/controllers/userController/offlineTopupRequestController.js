const FundRequest = require("../../models/fundRequestModel");

exports.getAllOfflineTopupRequests = async (req, res) => {
    try {
        const offlineTopupRequests = await FundRequest.find({
            userId: req.user.id,
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Offline topup requests fetched successfully",
            data: offlineTopupRequests,
        });
    } catch (error) {
        console.error("Error fetching offline topup requests:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
}

exports.addOfflineTopupRequest = async (req, res) => {
    try {
        const { amount, mode, receiverBank, utrNumber, paymentDate } = req.body;
        const paymentProof = req.file?.path;
        const requiredFields = ["amount", "mode", "receiverBank", "utrNumber", "paymentDate"]

        const missingFields = [];

        if (!paymentProof) {
            missingFields.push("paymentProof");
        }

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

        const offlineTopupRequest = new FundRequest({
            userId: req.user.id,
            amount,
            mode,
            receiverBank,
            utrNumber,
            paymentDate,
            paymentProof: `uploads/paymentProof/${paymentProof}`,
        });

        await offlineTopupRequest.save();

        return res.status(201).json({
            success: true,
            message: "Offline topup request added successfully",
            data: offlineTopupRequest,
        });
    } catch (error) {
        console.error("Error adding offline topup request:", error);
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