const Commission = require("../models/commissionModel");

exports.calculateCommission = async ({
  amount, //paise
  packageId,
  serviceId,
  operatorId = null,
  categoryId = null,
  pipeline,
}) => {
  try {
    const commissionPlan = await Commission.findOne({
      packageId,
      serviceId,
      pipelineCode: pipeline,
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
      commissionAmount = Math.round((amount * validPlan.commission) / 100);
    }

    return commissionAmount;
  } catch (error) {
    throw error;
  }
};
