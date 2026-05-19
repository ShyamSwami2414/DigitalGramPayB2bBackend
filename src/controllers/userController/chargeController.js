const mongoose = require("mongoose");

const User = require("../../models/userModel");
const Package = require("../../models/packageModel");
const Service = require("../../models/serviceModel");

const { calculateCommission } = require("../../helpers/calculateCommission");

const { rupeeToPaise, paiseToRupee } = require("../../utils/money");
const { calculateGst } = require("../../helpers/calculateGst");

exports.calculateTotalCharges = async (req, res, next) => {
  try {
    let {
      serviceId,
      pipeline,
      operatorId = null,
      categoryId = null,
      amount,
    } = req.query;

    // =========================
    // SANITIZE
    // =========================

    pipeline = typeof pipeline === "string" ? pipeline.trim() : "";

    amount = Number(amount);

    // =========================
    // VALIDATIONS
    // =========================

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: "serviceId is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid serviceId",
      });
    }

    if (!pipeline) {
      return res.status(400).json({
        success: false,
        message: "pipeline is required",
      });
    }

    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    // =========================
    // FETCH USER
    // =========================

    const user = await User.findOne({
      _id: req.user.id,
      isActive: true,
      isDeleted: false,
    }).select("packageId assignedServices");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.packageId) {
      return res.status(400).json({
        success: false,
        message: "No package assigned",
      });
    }

    // =========================
    // VALIDATE PACKAGE
    // =========================

    const packageExist = await Package.findOne({
      _id: user.packageId,
      isActive: true,
      isDeleted: false,
    });

    if (!packageExist) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    // =========================
    // VALIDATE SERVICE
    // =========================

    const service = await Service.findOne({
      _id: serviceId,
      "pipeline.code": pipeline,
      isActive: true,
      isDeleted: false,
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // =========================
    // CHECK SERVICE ASSIGNED
    // =========================

    const isAssigned = user.assignedServices?.some(
      (s) =>
        s.serviceId.toString() === service._id.toString() &&
        s.pipelineCodes.includes(pipeline),
    );

    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: "Service not assigned to user",
      });
    }

    // =========================
    // CONVERT TO PAISE
    // =========================

    const amountInPaise = rupeeToPaise(amount);

    // =========================
    // CALCULATE CHARGES
    // =========================

    const charges = await calculateCommission({
      amount: amountInPaise,

      packageId: user.packageId,

      serviceId: service._id,

      operatorId,

      categoryId,

      pipeline,
    });

    console.log(charges, "charges");

    if (charges === 0) {
      return res.status(400).json({
        success: false,
        message: "Charges not set for this amount or service, Contact Admin",
        data: {
          charges: charges,
        },
      });
    }

    const gst = calculateGst(charges); //paise

    // =========================
    // RESPONSE
    // =========================

    return res.status(200).json({
      success: true,
      message: "Applicable charges fetched successfully",

      data: {
        charges: paiseToRupee(charges || 0),
        gst: paiseToRupee(gst || 0),
        totalCharges: paiseToRupee(charges + gst || 0),
      },
    });
  } catch (error) {
    next(error);
  }
};
