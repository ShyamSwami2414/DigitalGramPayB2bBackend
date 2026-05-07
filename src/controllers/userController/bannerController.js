const Banner = require("../../models/bannerModel");

const getAllBanner = async (req, res, next) => {
  try {
    const banners = await Banner.find({
      isActive: true,
      isDeleted: false,
    })
      .sort({
        createdAt: -1,
      })
      .select("name imageUrl")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Banners fetched successfully",
      data: banners,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllBanner };
