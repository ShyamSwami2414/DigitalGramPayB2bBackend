const mongoose = require("mongoose");
const Field = require("../../models/fieldModel");
const Document = require("../../models/documentModel");
const OfflineService = require("../../models/offlineServiceModel");
const { paiseToRupee } = require("../../utils/money");

exports.listAllOfflineServices = async (req, res, next) => {
  try {
    const offlineServices = await OfflineService.find({
      isDeleted: false,
    }).lean();

    const formattedData = offlineServices.map((item) => ({
      ...item,
      amount: paiseToRupee(item.amount),
    }));

    return res.status(200).json({
      success: true,
      message: "Offline Service Fetched Successfully ",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getFormByServiceId = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Offline Service ID is Required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Offline Service ID",
      });
    }

    const [offlineService] = await OfflineService.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id), isDeleted: false } },
      {
        $lookup: {
          from: "fields",
          localField: "requiredFields",
          foreignField: "_id",
          as: "requiredFields",
        },
      },
      {
        $lookup: {
          from: "documents",
          localField: "requiredDocuments",
          foreignField: "_id",
          as: "requiredDocuments",
        },
      },
      {
        $project: {
          serviceName: 1,
          requiredFields: 1,
          requiredDocuments: 1,
        },
      },
    ]);

    if (!offlineService) {
      return res.status(404).json({
        success: false,
        message: "Offline Service Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offline Service Fetched Successfully ",
      data: offlineService,
    });
  } catch (error) {
    next(error);
  }
};
