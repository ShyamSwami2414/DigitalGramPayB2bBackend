const Policy = require("../../models/policyModel");
const sanitizeHtml = require("sanitize-html");

const VALID_TYPES = ["terms", "privacy", "refund"];

exports.getPolicyByType = async (req, res, next) => {
  try {
    let { type } = req.query;
    console.log(req.params, "query");
    type = type?.trim().toLowerCase();

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Policy Type is required",
      });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid policy type",
      });
    }

    const policy = await Policy.findOne({
      type: type,
      isDeleted: false,
    }).select("type siteTitle content isActive createdAt");

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Policy not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Policy Found",
      data: policy,
    });
  } catch (error) {
    next(error);
  }
};

exports.addPolicy = async (req, res, next) => {
  try {
    let { type, siteTitle, policyHeading, content } = req.body;

    type = type?.trim().toLowerCase();
    siteTitle = siteTitle?.trim().toLowerCase();
    policyHeading = policyHeading?.trim();

    const requiredFields = ["type", "siteTitle", "policyHeading", "content"];
    const missingFields = [];

    requiredFields.forEach((field) => {
      if (!req.body[field] || req.body[field].toString().trim() === "") {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid policy type",
      });
    }

    const isPolicyExist = await Policy.findOne({
      type: type,
      isDeleted: false,
    });

    if (isPolicyExist) {
      return res.status(400).json({
        success: false,
        message: "Policy type already exist",
      });
    }

    const policy = new Policy({
      type,
      siteTitle,
      policyHeading,
      content,
    });

    await policy.save();

    return res.status(200).json({
      success: true,
      message: "Policy saved successfully",
      data: policy,
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePolicy = async (req, res, next) => {
  try {
    let { type } = req.params;
    let { siteTitle, policyHeading, content, isActive } = req.body;

    type = type?.trim().toLowerCase();
    siteTitle = siteTitle?.trim().toLowerCase();
    policyHeading = policyHeading?.trim();

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Policy type is required",
      });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid policy type",
      });
    }

    const policy = await Policy.findOne({ type, isDeleted: false });

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Policy not found",
      });
    }

    // Update only provided fields
    if (siteTitle) policy.siteTitle = siteTitle.trim();
    if (policyHeading) policy.policyHeading = policyHeading.trim();
    if (content) policy.content = sanitizeHtml(content);
    if (typeof isActive === "boolean") policy.isActive = isActive;

    await policy.save();

    return res.status(200).json({
      success: true,
      message: "Policy updated successfully",
      data: policy,
    });
  } catch (error) {
    next(error);
  }
};

exports.deletePolicy = async (req, res, next) => {
  try {
    let { type } = req.params;

    type = type?.trim().toLowerCase();

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Policy type is required",
      });
    }

    const policy = await Policy.findOne({ type, isDeleted: false });

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Policy not found",
      });
    }

    policy.isDeleted = true;
    policy.deletedAt = new Date();

    await policy.save();

    return res.status(200).json({
      success: true,
      message: "Policy deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
