const Commission = require("../../models/commissionModel");
const mongoose = require("mongoose");
const Package = require("../../models/packageModel");
const Service = require("../../models/serviceModel");
const Operator = require("../../models/operatorModel");
const BbpsCategory = require("../../models/bbpsCategoryModel");

exports.getCommissionList = async (req, res, next) => {
  try {
    const { packageId, serviceId, operatorId, categoryId } = req.query;

    if (!packageId || !serviceId) {
      return res.status(400).json({
        success: false,
        message: "packageId and serviceId are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(packageId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Package ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Service ID",
      });
    }

    // check package
    const isValidPackage = await Package.findOne({
      _id: packageId,
      isActive: true,
      isDeleted: false,
    });

    if (!isValidPackage) {
      return res.status(404).json({
        success: false,
        message: "Package Not Found",
      });
    }

    // check service
    const isValidService = await Service.findOne({
      _id: serviceId,
      isActive: true,
      isDeleted: false,
    });

    if (!isValidService) {
      return res.status(404).json({
        success: false,
        message: "Service Not Found",
      });
    }

    let filter = {
      packageId: new mongoose.Types.ObjectId(packageId),
      serviceId: new mongoose.Types.ObjectId(serviceId),
    };

    if (operatorId) {
      filter.operatorId = new mongoose.Types.ObjectId(operatorId);
    }

    if (categoryId) {
      filter.categoryId = new mongoose.Types.ObjectId(categoryId);
    }

    const commissions = await Commission.aggregate([
      { $match: filter },

      { $unwind: "$plan" },

      // filter soft deleted plans
      {
        $match: {
          "plan.isDeleted": false,
        },
      },

      {
        $lookup: {
          from: "packages",
          localField: "packageId",
          foreignField: "_id",
          as: "package",
        },
      },
      { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "services",
          localField: "serviceId",
          foreignField: "_id",
          as: "service",
        },
      },
      { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "operators",
          localField: "operatorId",
          foreignField: "_id",
          as: "operator",
        },
      },
      { $unwind: { path: "$operator", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "bbpscategories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },

      {
        $project: {
          _id: 0, // remove default _id

          commissionId: "$_id",
          planId: "$plan._id",

          from: "$plan.from",
          to: "$plan.to",
          type: "$plan.type",
          commission: "$plan.commission",

          packageName: "$package.name",
          serviceName: "$service.name",
          operatorName: "$operator.name",
          categoryName: "$category.name",
        },
      },

      {
        $sort: { from: 1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Commissions fetched successfully",
      data: commissions,
    });
  } catch (error) {
    next(error);
  }
};

exports.createCommission = async (req, res, next) => {
  try {
    let { packageId, serviceId, operatorId, categoryId, plan } = req.body;

    if (!packageId || !serviceId) {
      return res.status(400).json({
        success: false,
        message: "packageId and serviceId are required",
      });
    }

    if (!Array.isArray(plan) || plan.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Plan must be a non-empty array",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(packageId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Package ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Service ID",
      });
    }

    // sort plans
    plan.sort((a, b) => a.from - b.from);

    const validatedPlans = [];

    for (let i = 0; i < plan.length; i++) {
      let { from, to, commission, type } = plan[i];

      from = Number(from);
      to = Number(to);
      commission = Number(commission);
      type = type?.trim().toLowerCase();

      if (isNaN(from) || isNaN(to) || isNaN(commission)) {
        return res.status(400).json({
          success: false,
          message: `Invalid numeric value in plan index ${i}`,
        });
      }

      if (from <= 0 || to <= 0) {
        return res.status(400).json({
          success: false,
          message: `Amount must be greater than 0 in plan index ${i}`,
        });
      }

      if (from >= to) {
        return res.status(400).json({
          success: false,
          message: `Invalid range in plan index ${i}`,
        });
      }

      if (!["flat", "percent"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid type in plan index ${i}`,
        });
      }

      if (type === "percent" && commission > 100) {
        return res.status(400).json({
          success: false,
          message: `Commission cannot exceed 100% in plan index ${i}`,
        });
      }

      // check overlap inside request
      if (i > 0) {
        const prev = validatedPlans[i - 1];

        if (from <= prev.to) {
          return res.status(400).json({
            success: false,
            message: `Plan overlaps with previous range at index ${i}`,
          });
        }
      }

      validatedPlans.push({
        from,
        to,
        commission,
        type,
      });
    }

    // validate package
    const isValidPackage = await Package.findOne({
      _id: packageId,
      isActive: true,
      isDeleted: false,
    });

    if (!isValidPackage) {
      return res.status(404).json({
        success: false,
        message: "Package Not Found",
      });
    }

    // validate service
    const isValidService = await Service.findOne({
      _id: serviceId,
      isActive: true,
      isDeleted: false,
    });

    if (!isValidService) {
      return res.status(404).json({
        success: false,
        message: "Service Not Found",
      });
    }

    // validate operator
    if (operatorId) {
      const isValidOperator = await Operator.findOne({
        _id: operatorId,
        isActive: true,
        isDeleted: false,
      });

      if (!isValidOperator) {
        return res.status(404).json({
          success: false,
          message: "Operator Not Found",
        });
      }
    }

    // validate category
    if (categoryId) {
      const isValidCategory = await BbpsCategory.findOne({
        _id: categoryId,
        isActive: true,
        isDeleted: false,
      });

      if (!isValidCategory) {
        return res.status(404).json({
          success: false,
          message: "Category Not Found",
        });
      }
    }

    // check if commission already exists
    let commissionDoc = await Commission.findOne({
      packageId,
      serviceId,
      operatorId: operatorId || null,
      categoryId: categoryId || null,
    });

    if (!commissionDoc) {
      // create new commission
      commissionDoc = await Commission.create({
        packageId,
        serviceId,
        operatorId: operatorId || null,
        categoryId: categoryId || null,
        plan: validatedPlans,
      });

      return res.status(201).json({
        success: true,
        message: "Commission Created Successfully",
        data: commissionDoc,
      });
    }

    const existingPlans = commissionDoc.plan.filter((p) => !p.isDeleted);
    const plansToInsert = [];

    for (let newPlan of validatedPlans) {
      // check if exact plan already exists
      const alreadyExists = existingPlans.some(
        (oldPlan) =>
          oldPlan.from === newPlan.from &&
          oldPlan.to === newPlan.to &&
          oldPlan.commission === newPlan.commission &&
          oldPlan.type === newPlan.type,
      );

      if (alreadyExists) continue;

      // check overlap
      for (let oldPlan of existingPlans) {
        if (newPlan.from <= oldPlan.to && newPlan.to >= oldPlan.from) {
          return res.status(400).json({
            success: false,
            message: `Plan range ${newPlan.from}-${newPlan.to} overlaps with existing range`,
          });
        }
      }

      plansToInsert.push(newPlan);
    }

    if (plansToInsert.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No new plans to add",
      });
    }

    commissionDoc.plan.push(...plansToInsert);
    await commissionDoc.save();

    return res.status(200).json({
      success: true,
      message: "Commission Plans Added Successfully",
      data: commissionDoc,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCommissionPlan = async (req, res, next) => {
  try {
    const { commissionId, planId } = req.body;

    if (!commissionId) {
      return res.status(400).json({
        success: false,
        message: "Commission ID Missing",
      });
    }

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "Plan ID Missing",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(commissionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Commission ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Plan ID",
      });
    }

    const planExist = await Commission.findOne({
      _id: commissionId,
      "plan._id": planId,
    });

    if (!planExist) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    const updatedCommission = await Commission.findOneAndUpdate(
      {
        _id: commissionId,
        plan: {
          $elemMatch: {
            _id: planId,
            isDeleted: false,
          },
        },
      },
      {
        $set: {
          "plan.$.isDeleted": true,
          "plan.$.deletedAt": new Date(),
        },
      },
      { new: true },
    );

    if (!updatedCommission) {
      return res.status(404).json({
        success: false,
        message: "Commission or Plan not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
