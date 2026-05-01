const mongoose = require("mongoose");
const OnlineService = require("../../models/onlineServiceModel");

exports.listAllOnlineServices = async (req, res, next) => {
  try {
    const onlineServices = await OnlineService.find({
      isActive: true,
      isDeleted: false,
    }).lean();

    const formattedData = onlineServices.map((item) => ({
      ...item,
    }));

    return res.status(200).json({
      success: true,
      message: "Online Service Fetched Successfully ",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};
