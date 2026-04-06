const InstantAepsBank = require("../../models/instantAepsBank");

//this api give all list
exports.getBanksList = async (req, res, next) => {
  try {
    const instantBank = await InstantAepsBank.find().select("bank_id name");

    return res.status(200).json({
      success: true,
      message: "Bank list fetched",
      data: instantBank,
    });
  } catch (error) {
    next(error);
  }
};
