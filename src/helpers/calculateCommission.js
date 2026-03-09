const Commission = require("../models/commissionModel");

exports.calculateCommission = async ({ amount, packageId, serviceId }) => {
  try {
    const commissionPlan = await Commission.findOne({
      packageId,
      serviceId,
    }).lean();

    if (!commissionPlan) {
      return {
        commission: 0,
        type: null,
        message: "Commission plan not found",
      };
    }

    const validPlan = commissionPlan.plan.find(
      (p) => !p.isDeleted && amount >= p.from && amount <= p.to,
    );

    if (!validPlan) {
      return {
        commission: 0,
        type: null,
        message: "No commission slab found",
      };
    }

    let commissionAmount = 0;

    if (validPlan.type === "flat") {
      commissionAmount = validPlan.commission;
    }

    if (validPlan.type === "percent") {
      commissionAmount = (amount * validPlan.commission) / 100;
    }

    commissionAmount = Number(commissionAmount.toFixed(2));

    return commissionAmount;
  } catch (error) {
    throw error;
  }
};
