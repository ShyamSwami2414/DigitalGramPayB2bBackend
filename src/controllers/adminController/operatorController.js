const Operator = require("../../models/operatorModel");

exports.getActiveOperatorList = async (req, res, next) => {
  try {
    const operators = await Operator.find({
      isActive: true,
      isDeleted: false,
    })
      .select("name")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Operators fetched successfully",
      data: operators,
    });
  } catch (error) {
    next(error);
  }
};
