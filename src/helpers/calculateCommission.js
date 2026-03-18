const Commission = require("../models/commissionModel");

exports.calculateCommission = async ({
  amount,
  packageId,
  serviceId,
  operatorId = null,
  categoryId = null,
}) => {
  try {
    const commissionPlan = await Commission.findOne({
      packageId,
      serviceId,
      ...(operatorId ? { operatorId } : {}),
      ...(categoryId ? { categoryId } : {}),
    }).lean();

    if (!commissionPlan) return 0;

    const validPlan = commissionPlan.plan.find(
      (p) => !p.isDeleted && amount >= p.from && amount <= p.to,
    );

    if (!validPlan) {
      return 0;
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
