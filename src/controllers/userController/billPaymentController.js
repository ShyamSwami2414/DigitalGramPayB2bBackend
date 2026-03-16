const BbpsBillers = require("../../models/bbpsBillersModel");
const BbpsCategory = require("../../models/bbpsCategoryModel");
const mongoose = require("mongoose");
const {
  fetchBbpsBillerInfoService,
} = require("../../services/fetchBbpsBillerInfoService");
const { fetchBbpsBillService } = require("../../services/fetchBbpsBillService");
const {
  validateBbpsBillService,
} = require("../../services/validateBbpsBillService");
const { payBbpsBillService } = require("../../services/payBbpsBillService");

exports.fetchBbpsCategories = async (req, res, next) => {
  try {
    let { category = "" } = req.query;

    category = category?.trim().toLowerCase();
    console.log(category, "category");

    const filter = { isActive: true, isDeleted: false };

    if (category) {
      filter.group = category;
    }

    const bbpsCategories = await BbpsCategory.find(filter).select("name group");

    return res.status(200).json({
      success: true,
      message: "Bbps Categories Fetched",
      data: bbpsCategories,
    });
  } catch (error) {
    next(error);
  }
};

exports.fetchParticularCategoryBillersList = async (req, res, next) => {
  try {
    let { category = "" } = req.query;
    category = category?.trim();

    console.log(category, "category");

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Bbps Category is required",
      });
    }

    const filter = { isActive: true, isDeleted: false };

    if (category) {
      filter.billerCategory = category;
    }

    const bbpsBillers = await BbpsBillers.find(filter).select(
      "billerId billerName billerCategory",
    );

    return res.status(200).json({
      success: true,
      message: "Bbps Billers Fetched",
      data: bbpsBillers,
    });
  } catch (error) {
    next(error);
  }
};

exports.fetchBbpsBillerInfo = async (req, res, next) => {
  try {
    const { billerId } = req.query;

    console.log(billerId, "billerId");
    console.log(req.query);

    if (!billerId || billerId === "undefined" || billerId.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Biller ID is required",
      });
    }

    const response = await fetchBbpsBillerInfoService(billerId);

    return res.status(200).json({
      success: true,
      message: "Biller Found",
      data: response,
    });
  } catch (error) {
    next(error);
  }
};

exports.fetchBbpsBill = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let { billerId, inputParams } = req.body;
    billerId = billerId?.trim();

    console.log(userId, "userId");
    console.log(req.body, "body");

    if (!billerId) {
      return res.status(400).json({
        success: false,
        message: "Biller ID is required",
      });
    }

    if (!Array.isArray(inputParams) || inputParams.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Input Params must be a non-empty array",
      });
    }

    const response = await fetchBbpsBillService(userId, billerId, inputParams);

    console.log(response, "controller response");

    return res.status(200).json({
      success: true,
      message: "Bill Fetched",
      data: { ...response?.data?.billerResponse, refid: response?.refid },
    });
  } catch (error) {
    next(error);
  }
};

exports.validateBbpsBill = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let { billerId, paramName, paramValue } = req.body;
    billerId = billerId?.trim();
    paramName = paramName?.trim();
    paramValue = paramValue?.trim();

    console.log(userId, "userId");
    console.log(req.body, "body");

    const requiredFields = ["billerId", "paramName", "paramValue"];
    const missingFields = requiredFields.filter(
      (field) => !req.body[field]?.trim?.(),
    );

    if (missingFields.length) {
      return res.status(400).json({
        success: false,
        message: `${missingFields.join(", ")} are required`,
      });
    }

    const response = await validateBbpsBillService(
      billerId,
      paramName,
      paramValue,
    );

    console.log(response, "controller response");

    return res.status(200).json({
      success: true,
      message: "Bill Validated",
      data: { ...response?.data, refid: response?.refid },
    });
  } catch (error) {
    next(error);
  }
};

exports.payBbpsBill = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let {
      refId,
      billerId,
      customerName,
      customerMobile,
      dueDate,
      billamount,
      billDate,
      billPeriod,
      billNumber,
      placeholderValue,
      paramValue,
    } = req.body;

    refId = refId?.trim();
    billerId = billerId?.trim();
    customerName = customerName?.trim();
    customerMobile = customerMobile?.trim();
    dueDate = dueDate?.trim();
    billamount = billamount?.trim();
    billDate = billDate?.trim();
    billPeriod = billPeriod?.trim();
    billNumber = billNumber?.trim();
    placeholderValue = placeholderValue?.trim();
    paramValue = paramValue?.trim();

    console.log(userId, "userId");
    console.log(req.body, "body");

    const requiredFields = [
      "refId",
      "billerId",
      "customerName",
      "customerMobile",
      "dueDate",
      "billamount",
      "billDate",
      "billPeriod",
      "billNumber",
      "placeholderValue",
      "paramValue",
    ];

    const missingFields = requiredFields.filter(
      (field) => !req.body[field]?.trim?.(),
    );

    if (missingFields.length) {
      return res.status(400).json({
        success: false,
        message: `${missingFields.join(", ")} are required`,
      });
    }

    const response = await payBbpsBillService(
      refId,
      billerId,
      customerName,
      customerMobile,
      dueDate,
      billamount,
      billDate,
      billPeriod,
      billNumber,
      placeholderValue,
      paramValue,
    );

    console.log(response, "controller response");

    return res.status(200).json({
      success: true,
      message: "Bill Validated",
      data: { ...response?.data, refid: response?.refid },
    });
  } catch (error) {
    next(error);
  }
};
