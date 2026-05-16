const Package = require("../../models/packageModel");

exports.getAllPackages = async (req, res, next) => {
  try {
    const packages = await Package.find({ isActive: true, isDeleted: false });
    return res.status(200).json({
      success: true,
      message: "Packages fetched successfully",
      data: packages,
    });
  } catch (error) {
    next(error);
  }
};
