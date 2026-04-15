const EkoState = require("../../models/ekoStateModel");

exports.getStateList = async (req, res, next) => {
  try {
    const states = await EkoState.find()
      .select("label")
      .sort({ label: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "State List Fetched",
      data: states,
    });
  } catch (error) {
    console.error("Get States Error:", error);

    next(error);
  }
};
