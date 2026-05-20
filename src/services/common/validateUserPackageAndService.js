const User = require("../../models/userModel");
const Package = require("../../models/packageModel");
const Service = require("../../models/serviceModel");
const Commission = require("../../models/commissionModel");

const validateUserPackageAndService = async ({
  userId,
  serviceName,
  serviceTypeName = null, //for aeps2 {"withdraw", "inquiry", "statement"}
  pipeline,
  operatorId = null,
  categoryId = null,
  amount, //paise
}) => {
  const user = await User.findOne({
    _id: userId,
    isActive: true,
    isDeleted: false,
  }).select("packageId assignedServices");

  if (!user?.packageId) {
    throw new Error("No Package Assigned");
  }

  if (!user?.assignedServices?.length) {
    throw new Error("No Service Assigned to user");
  }

  console.log("assignedPackage", user?.packageId);
  console.log("assignedServices", user?.assignedServices);

  const isPackageExist = await Package.findOne({
    _id: user.packageId,
    isActive: true,
    isDeleted: false,
  });

  if (!isPackageExist) {
    throw new Error("Package Not Exist");
  }

  const service = await Service.findOne({
    name: serviceName,
    "pipeline.code": pipeline,
    isActive: true,
    isDeleted: false,
  });

  if (!service) {
    throw new Error(`${serviceName} service not exist`);
  }

  const isAssigned = user?.assignedServices?.some(
    (s) =>
      s?.serviceId.toString() === service._id.toString() &&
      s?.pipelineCodes.includes(pipeline),
  );

  console.log(service, "service");
  console.log(isAssigned, "isAssigned");

  // const isAssigned = user.assignedServices.some(
  //   (id) => id.toString() === service._id.toString(),
  // );

  if (!isAssigned) {
    throw new Error(`${serviceName} Service Not Assigned`);
  }

  const commissionPlan = await Commission.findOne({
    packageId: user.packageId,
    serviceId: service._id,
    pipelineCode: pipeline,
    operatorId: operatorId,
    categoryId: categoryId,
  }).lean();

  console.log(commissionPlan, "commissionPlan");

  if (!commissionPlan) {
    if (serviceTypeName && serviceTypeName !== "WITHDRAW") {
      return { packageId: user.packageId, serviceId: service._id };
    }

    throw new Error(
      `Commission not set for this service, Please contact Admin`,
    );
  }

  const validPlan = commissionPlan.plan.find(
    (p) => !p.isDeleted && amount >= p.from && amount <= p.to,
  );

  if (!validPlan) {
    if (serviceTypeName && serviceTypeName !== "WITHDRAW") {
      return { packageId: user.packageId, serviceId: service._id };
    }

    throw new Error(`Commission not set for this service, Contact Admin`);
  }

  return { packageId: user.packageId, serviceId: service._id };
};

module.exports = {
  validateUserPackageAndService,
};
