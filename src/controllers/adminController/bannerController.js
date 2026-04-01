const Banner = require("../../models/bannerModel");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const getAllBanners = async (req, res, next) => {
  try {
    const banners = await Banner.find({ isDeleted: false }).sort({
      createdAt: -1,
    });

    res
      .status(200)
      .json({ success: true, message: "Banner Fetched", data: banners });
  } catch (error) {
    next(error);
  }
};

const addBanner = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      const err = new Error("Name is required");
      err.statusCode = 400;
      throw err;
    }

    if (!req.file) {
      const err = new Error("Banner image is required");
      err.statusCode = 400;
      throw err;
    }

    const banner = await Banner.create({
      name,
      imageUrl: `/uploads/banner/${req.file.filename}`,
    });

    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    next(error);
  }
};

const deleteBanner = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid ID");
      err.statusCode = 400;
      throw err;
    }

    const banner = await Banner.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: Date.now() } },
    );

    if (!banner) {
      const err = new Error("Banner not found or Deleted");
      err.statusCode = 404;
      throw err;
    }

    const filePath = path.join(process.cwd(), banner.imageUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res
      .status(200)
      .json({ success: true, message: "Banner deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const toggleBannerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid ID");
      err.statusCode = 400;
      throw err;
    }

    const banner = await Banner.findOne({ _id: id, isDeleted: false });

    if (!banner) {
      const err = new Error("Banner not found or Deleted");
      err.statusCode = 404;
      throw err;
    }

    banner.isActive = !banner.isActive;
    await banner.save();

    res.status(200).json({
      success: true,
      message: `Banner is now ${banner.isActive ? "active" : "inactive"}`,
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllBanners,
  addBanner,
  deleteBanner,
  toggleBannerStatus,
};
