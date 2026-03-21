const GlobalBank = require("../../models/globalBankModel");

const getGlobalBankList = async (req, res, next) => {
  try {
    const banks = await GlobalBank.aggregate([
      { $match: {} },
      {
        $project: {
          _id: 0,
          bankId: 1,
          bankName: 1,
        },
      },

      {
        $sort: {
          bankName: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Bank List Fetched",
      data: banks,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getGlobalBankList };
