const BbpsBillers = require("../../models/bbpsBillersModel");
const BbpsCategory = require("../../models/bbpsCategoryModel");
const mongoose = require("mongoose");
const {
  fetchBbpsBillerInfoService,
} = require("../../services/fetchBbpsBillerInfoService");
const { fetchBbpsBillService } = require("../../services/fetchBbpsBillService");

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

    return res.status(200).json({
      success: true,
      message: "Bill Fetched",
      data: response?.billerResponse,
    });
  } catch (error) {
    next(error);
  }
};
