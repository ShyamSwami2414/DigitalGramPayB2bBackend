const Service = require("../../models/serviceModel");

exports.getServiceList = async (req, res, next) => {
  try {
    const services = await Service.aggregate([
      {
        $match: {
          isActive: true,
          isDeleted: false,
        },
      },
      {
        $project: {
          name: 1,
          label: "$serviceCode",
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Services fetched successfully",
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

exports.serviceListWithPipeline = async (req, res, next) => {
  try {
    const services = await Service.aggregate([
      {
        $match: {
          isActive: true,
          isDeleted: false,
        },
      },
      {
        $project: {
          name: 1,
          label: "$serviceCode",
          hasCategory: 1,
          pipeline: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Services fetched successfully",
      data: services,
    });
  } catch (error) {
    next(error);
  }
};