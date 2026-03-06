const BbpsCategory = require("../../models/bbpsCategoryModel");

exports.getActiveBbpsCategoryList = async (req, res, next) => {
  try {
    const packages = await BbpsCategory.find({
      isActive: true,
      isDeleted: false,
    })
      .select("name")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Bbps category fetched successfully",
      data: packages,
    });
  } catch (error) {
    next(error);
  }
};
