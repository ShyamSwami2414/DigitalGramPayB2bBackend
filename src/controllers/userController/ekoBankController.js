const EkoBank = require("../../models/ekoBankModel");

exports.getBankList = async (req, res, next) => {
  try {
    const banks = await EkoBank.find()
      .select("bankName")
      .sort({ label: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Bank List Fetched",
      data: banks,
    });
  } catch (error) {
    console.error("Get Banks Error:", error);

    next(error);
  }
};
