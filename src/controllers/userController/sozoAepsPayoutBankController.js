const SozoAepsPayoutBank = require("../../models/sozoAepsPayoutBankModel");

exports.getBankList = async (req, res, next) => {
  try {
    const banks = await SozoAepsPayoutBank.find()
      .select("bankName")
      .sort({ label: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Bank List Fetched Successfully",
      data: banks,
    });
  } catch (error) {
    console.error("Get Banks Error:", error);

    next(error);
  }
};
