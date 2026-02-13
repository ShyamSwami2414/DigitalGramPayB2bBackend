const Package = require("../../models/packageModel");

exports.getAllPackages = async (req, res) => {
  try {
    const packages = await Package.find({ isActive: true, isDeleted: false });
    return res.status(200).json({
      success: true,
      message: "Packages fetched successfully",
      data: packages,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
