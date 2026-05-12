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
const config = require("../../config/client");

exports.addServiceRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;

    let { serviceId, pipeline } = req.body;
    serviceId = serviceId?.trim();

    const requiredFields = ["serviceId", "pipeline"];

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

    const isServiceExist = await Service.findOne({
      _id: serviceId,
      "pipeline.code": pipeline,
    })
      .select("name status")
      .lean();

    if (!isServiceExist) {
      return res.status(400).json({
        success: false,
        message: "Service not found ",
      });
    }

    const existingRequest = await ServiceRequest.findOne({
      userId: req.user.id,
      serviceId: serviceId,
      pipelineCode: pipeline,
    });

    console.log(req.body, "body");
    console.log(existingRequest, "existingRequest");

    if (existingRequest) {
      if (existingRequest.status === "rejected") {
        //  Reuse old request
        existingRequest.status = "pending";
        existingRequest.rejectionReason = ""; // optional reset
        await existingRequest.save();

        return res.status(200).json({
          success: true,
          message: "Request resubmitted successfully",
        });
      } else if (existingRequest.status === "assigned") {
        return res.status(400).json({
          success: false,
          message: "Service already assigned to you",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Request already exists for this user and is under review",
      });
    }

    const serviceRequest = new ServiceRequest({
      userId: req.user.id,
      serviceId: serviceId,
      pipelineCode: pipeline,
    });

    await serviceRequest.save();

    const html = adminServiceRequestTemplate({
      userName: isUserExist?.userName,
      userEmail: isUserExist?.email,
      userMobile: isUserExist?.phone,
      serviceName: isServiceExist?.name,
      buttonUrl: `${config.DOMAIN}/service-requests`,
    });

    await sendEmail(
      `${config.COMPANY_EMAIL}`,
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
