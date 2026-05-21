const Setting = require("../../models/settingModel");

exports.getWebSettings = async (req, res, next) => {
  try {
    const setting = await Setting.findOne()
      .select(
        "title logoUrl faviconUrl email phone facebook instagram twitter linkedin address",
      )
      .lean();

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: "Settings not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Successful",
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};
