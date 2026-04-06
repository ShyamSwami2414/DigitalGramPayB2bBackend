const Policy = require("../../models/policyModel");
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
    }).select("type siteTitle content policyHeading");

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
