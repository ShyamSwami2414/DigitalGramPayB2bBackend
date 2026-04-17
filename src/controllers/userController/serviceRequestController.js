const mongoose = require("mongoose");
const ServiceRequest = require("../../models/serviceRequestModel");
const User = require("../../models/userModel");
const Service = require("../../models/serviceModel");
const { rupeeToPaise, paiseToRupee } = require("../../utils/money");
const {
  generateUniqueRefernceId,
} = require("../../utils/generateUniqueReferenceId");
const {
  adminServiceRequestTemplate,
} = require("../../templates/emailTemplates/serviceRequestAdminEmailTemplate");
const { sendEmail } = require("../../utils/email");

exports.addServiceRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;

    let { serviceId } = req.body;
    serviceId = serviceId?.trim();

    const requiredFields = ["serviceId"];

    const missingFields = [];

    requiredFields.forEach((field) => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Service ID",
      });
    }

    const isUserExist = await User.findOne({
      _id: userId,
      isActive: true,
      isDeleted: false,
    })
      .select("userName email phone")
      .lean();

    if (!isUserExist) {
      return res.status(400).json({
        success: false,
        message: "User not found or not active",
      });
    }

    const isServiceExist = await Service.findOne({ _id: serviceId })
      .select("name")
      .lean();

    if (!isServiceExist) {
      return res.status(400).json({
        success: false,
        message: "Service not found ",
      });
    }

    const isRequestExist = await ServiceRequest.findOne({
      userId: req.user.id,
      serviceId: serviceId,
      status: { $ne: "rejected" },
    });

    if (isRequestExist) {
      return res.status(400).json({
        success: false,
        message:
          "Request already exist for this User waiting for further reviews",
      });
    }

    const serviceRequest = new ServiceRequest({
      userId: req.user.id,
      serviceId: serviceId,
    });

    await serviceRequest.save();

    const html = adminServiceRequestTemplate({
      userName: isUserExist?.userName,
      userEmail: isUserExist?.email,
      userMobile: isUserExist?.phone,
      serviceName: isServiceExist?.name,
      buttonUrl: `http://192.168.1.31:5173/serviceRequest`,
    });

    await sendEmail(
      "rahul.camlenio@gmail.com",
      "",
      "",
      "New Service Request",
      html,
    );

    return res.status(201).json({
      success: true,
      message: "Service request added successfully",
    });
  } catch (error) {
    next(error);
  }
};
