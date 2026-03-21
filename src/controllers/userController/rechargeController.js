const mongoose = require("mongoose");
const States = require("../../models/statesModel");
const UserWallet = require("../../models/userWallet.js");
const { doRechargeService } = require("../../services/doRechargeService.js");
const { fetchPlan } = require("../../services/fetchPlanService.js");
const {
  rechargeMobileVerify,
} = require("../../services/rechargeMobileVerify.js");
const Operator = require("../../models/operatorModel.js");
const {
  generateUniqueRefernceId,
} = require("../../utils/generateUniqueReferenceId.js");
const { rupeeToPaise } = require("../../utils/money.js");

exports.getAllOperatorCodeList = async (req, res, next) => {
  try {
    const operators = [
      { label: "JIO", planFetchValue: "Jio", rechargeValue: "RJP" },
      { label: "AIRTEL", planFetchValue: "Airtel", rechargeValue: "ATP" },
      {
        label: "VODAFONE IDEA",
        planFetchValue: "VodafoneIdea",
        rechargeValue: "IDP",
      },
      {
        label: "BSNL TALKTIME",
        planFetchValue: "BSNLTalktime",
        rechargeValue: "BVP",
      },
    ];

    return res.status(200).json({
      success: true,
      message: "Operator Code List Fetched Successfully",
      data: operators,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllCircleCodeList = async (req, res, next) => {
  try {
    const circleData = await States.find({ isActive: true })
      .select("circleCode circleName ")
      .lean();

    if (circleData.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Circle Code Fetched Successfully",
        data: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Circle Code List Fetched Successfully",
      data: circleData,
    });
  } catch (error) {
    next(error);
  }
};

exports.mobileVerify = async (req, res, next) => {
  try {
    const { mobile } = req.params;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile Number is required",
      });
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid mobile number",
      });
    }

    const referenceId = generateUniqueRefernceId();

    const mobileVerifyResponse = await rechargeMobileVerify(
      mobile,
      referenceId,
    );

    console.log(mobileVerifyResponse, "mobileVerifyResponse");

    // if (mobileVerifyResponse?.status !== "success") {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Mobile Verification Failed",
    //     data: mobileVerifyResponse.data,
    //   });
    // }

    res.status(200).json({
      success: true,
      message: "Mobile Number Verified Successfully",
      data: mobileVerifyResponse,
    });
  } catch (error) {
    next(error);
  }
};

exports.fetchPlan = async (req, res, next) => {
  try {
    let { operatorCode, circleName } = req.query;
    // console.log(operatorCode, "operatorCode");
    // console.log(circleName, "circleName");

    operatorCode = operatorCode?.trim();
    circleName = circleName?.trim();

    if (!operatorCode || !circleName) {
      return res.status(400).json({
        success: false,
        message: "Operator code and Circle name is required",
      });
    }

    if (
      !["Jio", "Airtel", "BSNLTalktime", "VodafoneIdea"].includes(operatorCode)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Operator Code",
      });
    }

    const circleNameExist = await States.findOne({ circleName });

    if (!circleNameExist) {
      return res.status(404).json({
        success: false,
        message: "Invalid Circle name",
      });
    }

    const response = await fetchPlan(operatorCode, circleName);

    res.status(200).json({
      success: true,
      message: "Plan Fetched Successfully",
      data: response,
    });
  } catch (error) {
    next(error);
  }
};

exports.doMobilePrepaidRecharge = async (req, res, next) => {
  try {
    console.log(req.user);
    let { amount, operatorCode, number, billerMode } = req.body;
    amount = Number(amount);
    operatorCode = operatorCode?.trim();
    number = number?.trim();
    billerMode = billerMode?.trim();

    const userId = req.user.id; //user Id
    const amountInPaise = rupeeToPaise(amount);

    const requiredFields = ["amount", "operatorCode", "number", "billerMode"];

    let missingFields = [];

    requiredFields.forEach((field) => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });

    console.log(missingFields, "missingFields");

    if (missingFields.length > 0) {
      const err = new Error("Missing required fields");
      err.statusCode = 400;
      err.missingFields = missingFields;
      throw err;
    }

    if (!/^[6-9]\d{9}$/.test(number)) {
      const err = new Error("Enter a valid mobile number");
      err.statusCode = 400;
      throw err;
    }

    //paise
    if (amountInPaise < 1000) {
      const err = new Error("Amount must be equal to or greater than 10");
      err.statusCode = 400;
      throw err;
    }

    if (billerMode !== "prepaidrecharge") {
      const err = new Error("Invalid biller mode");
      err.statusCode = 400;
      throw err;
    }

    if (!["ATP", "BVP", "IDP", "RJP"].includes(operatorCode)) {
      const err = new Error("Invalid operator code");
      err.statusCode = 400;
      throw err;
    }

    const operatorId = await Operator.findOne({
      rechargeValue: operatorCode,
      isActive: true,
      isDeleted: false,
    });

    if (!operatorId) {
      const err = new Error("Operator Selected Not Found");
      err.statusCode = 404;
      throw err;
    }

    const response = await doRechargeService({
      userId,
      operatorId: operatorId._id,
      amount: amountInPaise,
      operatorCode,
      operatorName: operatorId.name,
      number,
      billerMode,
    });

    if (response.status === "FAILED") {
      return res.status(400).json({
        success: false,
        message: "Recharge Failed",
        data: response,
      });
    }

    if (response.status === "PENDING") {
      return res.status(400).json({
        success: true,
        message: "Recharge Pending",
        data: response,
      });
    }

    console.log("controller final response", response);

    return res.status(200).json({
      success: true,
      message: "Recharge Successful",
      data: response,
    });
  } catch (error) {
    next(error);
  }
};
