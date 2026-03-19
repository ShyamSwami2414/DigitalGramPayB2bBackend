const RechargeReport = require("../../models/rechargeReportModel");

const getMyLastRechargeHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const data = await RechargeReport.find({
      userId,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return res.status(200).json({
      success: true,
      message: "Last recharge history fetched",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyLastRechargeHistory };
