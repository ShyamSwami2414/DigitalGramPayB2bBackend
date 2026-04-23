const Commission = require("../../models/commissionModel");
const mongoose = require("mongoose");
const Package = require("../../models/packageModel");
const Service = require("../../models/serviceModel");
const Operator = require("../../models/operatorModel");
const BbpsCategory = require("../../models/bbpsCategoryModel");
const { rupeeToPaise, paiseToRupee } = require("../../utils/money");

exports.getCommissionList = async (req, res, next) => {
  try {
    let { packageId, serviceId, pipeline, operatorId, categoryId } = req.query;
    pipeline = pipeline?.trim()?.toLowerCase();

    const requiredFields = ["packageId", "serviceId", "pipeline"];
    const missingFields = [];

    requiredFields.forEach((field) => {
      if (!req.query[field]) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const validateId = (id, name) => {
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`Invalid ${name}`);
      }
    };

    try {
      validateId(packageId, "Package ID");
      validateId(serviceId, "Service ID");

      const [pkg, service] = await Promise.all([
        Package.findOne({
          _id: packageId,
          isActive: true,
          isDeleted: false,
        }).select("_id"),

        Service.findOne({
          _id: serviceId,
          isActive: true,
          isDeleted: false,
        }).select("_id"),
      ]);

      if (!pkg) {
        return res.status(404).json({
          success: false,
          message: "Package Not Found",
        });
      }

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service Not Found",
        });
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    let filter = {
      packageId: new mongoose.Types.ObjectId(packageId),
      serviceId: new mongoose.Types.ObjectId(serviceId),
      pipelineCode: pipeline?.toLowerCase(),
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

          packageId: "$package._id",
          packageName: "$package.name",
          serviceId: "$service._id",
          serviceName: "$service.name",
          operatorId: "$operator._id",
          operatorName: "$operator.name",
          categoryId: "$category._id",
          categoryName: "$category.name",
        },
      },

      {
        $sort: { from: 1 },
      },
    ]);

    const formattedData = commissions.map((item) => ({
      ...item,
      from: paiseToRupee(item?.from),
      to: paiseToRupee(item?.to),
      commission:
        item?.type === "flat"
          ? paiseToRupee(item?.commission)
          : item?.commission,
    }));

    return res.status(200).json({
      success: true,
      message: "Commissions fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.createCommission = async (req, res, next) => {
  try {
    let { packageId, serviceId, pipeline, operatorId, categoryId, plan } =
      req.body;
    pipeline = pipeline?.trim()?.toLowerCase();

    const requiredFields = ["packageId", "serviceId", "pipeline"];
    const missingFields = [];

    requiredFields.forEach((field) => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    if (!Array.isArray(plan) || plan.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Plan must be a non-empty array",
      });
    }

    //  Normalize + convert
    plan = plan.map((p, i) => {
      const type = p.type?.toString().trim().toLowerCase();

      return {
        from: Number(rupeeToPaise(p.from)),
        to: Number(rupeeToPaise(p.to)),
        commission:
          type === "percent"
            ? Number(p.commission)
            : Number(rupeeToPaise(p.commission)),
        type,
      };
    });

    //  Sort plans
    plan.sort((a, b) => a.from - b.from);

    const validatedPlans = [];

    for (let i = 0; i < plan.length; i++) {
      let { from, to, commission, type } = plan[i];

      // ✅ Basic validations
      if ([from, to, commission].some((v) => isNaN(v))) {
        return res.status(400).json({
          success: false,
          message: `Invalid numeric value at index ${i}`,
        });
      }

      if (from <= 0 || to <= 0) {
        return res.status(400).json({
          success: false,
          message: `Amounts must be greater than 0 at index ${i}`,
        });
      }

      if (from >= to) {
        return res.status(400).json({
          success: false,
          message: `Invalid range at index ${i}`,
        });
      }

      if (!["flat", "percent"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid type at index ${i}`,
        });
      }

      if (type === "percent" && commission > 100) {
        return res.status(400).json({
          success: false,
          message: `Commission cannot exceed 100% at index ${i}`,
        });
      }

      // ✅ Overlap check inside request (CRITICAL)
      if (i > 0) {
        const prev = validatedPlans[i - 1];
        if (from <= prev.to) {
          return res.status(400).json({
            success: false,
            message: `Overlapping ranges at index ${i}`,
          });
        }
      }

      validatedPlans.push({ from, to, commission, type });
    }

    //common validator for all
    const validateId = (id) => id && mongoose.Types.ObjectId.isValid(id);

    if (!validateId(packageId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Package ID" });
    }

    if (!validateId(serviceId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Service ID" });
    }

    if (operatorId && !validateId(operatorId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Operator ID" });
    }

    if (categoryId && !validateId(categoryId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Category ID" });
    }

    //  Run all DB queries in parallel
    const [pkg, service, operator, category] = await Promise.all([
      Package.findOne({
        _id: packageId,
        isActive: true,
        isDeleted: false,
      }).select("_id"),

      Service.findOne({
        _id: serviceId,
        isActive: true,
        isDeleted: false,
        "pipeline.code": pipeline,
      }).select("_id pipeline"),

      operatorId
        ? Operator.findOne({
            _id: operatorId,
            isActive: true,
            isDeleted: false,
          }).select("_id")
        : null,

      categoryId
        ? BbpsCategory.findOne({
            _id: categoryId,
            isActive: true,
            isDeleted: false,
          }).select("_id")
        : null,
    ]);

    //  Check results
    if (!pkg) {
      return res
        .status(404)
        .json({ success: false, message: "Package Not Found" });
    }

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service or Pipeline Not Found or invalid",
      });
    }

    if (operatorId && !operator) {
      return res
        .status(404)
        .json({ success: false, message: "Operator Not Found" });
    }

    if (categoryId && !category) {
      return res
        .status(404)
        .json({ success: false, message: "Category Not Found" });
    }

    // ✅ Find existing commission
    let commissionDoc = await Commission.findOne({
      packageId,
      serviceId,
      pipelineCode: pipeline,
      operatorId: operatorId || null,
      categoryId: categoryId || null,
    });

    if (!commissionDoc) {
      await Commission.create({
        packageId,
        serviceId,
        pipelineCode: pipeline || null,
        operatorId: operatorId || null,
        categoryId: categoryId || null,
        plan: validatedPlans,
      });

      return res.status(201).json({
        success: true,
        message: "Commission Created Successfully",
      });
    }

    //  UPDATE (MERGE MODE)

    // Step 1: get existing
    const existingPlans = commissionDoc.plan || [];

    // Step 2: merge
    const mergedPlans = [...existingPlans, ...validatedPlans];

    // Step 3: sort
    mergedPlans.sort((a, b) => a.from - b.from);

    // Step 4: validate merged
    for (let i = 0; i < mergedPlans.length; i++) {
      const { from, to, commission, type } = mergedPlans[i];

      if ([from, to, commission].some((v) => isNaN(v))) {
        return res.status(400).json({
          success: false,
          message: `Invalid numeric value at merged index ${i}`,
        });
      }

      if (from <= 0 || to <= 0) {
        return res.status(400).json({
          success: false,
          message: `Amounts must be greater than 0 at merged index ${i}`,
        });
      }

      if (from >= to) {
        return res.status(400).json({
          success: false,
          message: `Invalid range at merged index ${i}`,
        });
      }

      if (!["flat", "percent"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid type at merged index ${i}`,
        });
      }

      if (type === "percent" && commission > 100) {
        return res.status(400).json({
          success: false,
          message: `Commission cannot exceed 100% at merged index ${i}`,
        });
      }

      // 🔥 overlap check
      if (i > 0) {
        const prev = mergedPlans[i - 1];

        if (from <= prev.to) {
          return res.status(400).json({
            success: false,
            message: `message: Overlapping between existing ${paiseToRupee(prev.from)}-${paiseToRupee(prev.to)} and ${paiseToRupee(from)}-${paiseToRupee(to)}`,
          });
        }
      }
    }

    // Step 5: save
    commissionDoc.plan = mergedPlans;
    await commissionDoc.save();

    return res.status(200).json({
      success: true,
      message: "Commission Updated (Merged) Successfully",
    });
  } catch (error) {
    next(error);
  }
};

// exports.createCommission = async (req, res, next) => {
//   try {
//     let { packageId, serviceId, operatorId, categoryId, plan } = req.body;

//     if (!packageId || !serviceId) {
//       return res.status(400).json({
//         success: false,
//         message: "packageId and serviceId are required",
//       });
//     }

//     if (!Array.isArray(plan) || plan.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Plan must be a non-empty array",
//       });
//     }

//     if (!mongoose.Types.ObjectId.isValid(packageId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid Package ID",
//       });
//     }

//     if (!mongoose.Types.ObjectId.isValid(serviceId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid Service ID",
//       });
//     }

//     //rupee to paise
//     plan = plan.map((p) => ({
//       from: rupeeToPaise(p.from),
//       to: rupeeToPaise(p.to),
//       commission:
//         p.type === "percent"
//           ? Number(p.commission)
//           : rupeeToPaise(p.commission),
//       type: p.type?.trim().toLowerCase(),
//     }));

//     // sort plans
//     plan.sort((a, b) => a.from - b.from);

//     const validatedPlans = [];

//     for (let i = 0; i < plan.length; i++) {
//       let { from, to, commission, type } = plan[i];

//       from = Number(from);
//       to = Number(to);
//       commission = Number(commission);
//       type = type?.trim().toLowerCase();

//       if (isNaN(from) || isNaN(to) || isNaN(commission)) {
//         return res.status(400).json({
//           success: false,
//           message: `Invalid numeric value in plan index ${i}`,
//         });
//       }

//       if (from <= 0 || to <= 0) {
//         return res.status(400).json({
//           success: false,
//           message: `Amount must be greater than 0 in plan index ${i}`,
//         });
//       }

//       if (from >= to) {
//         return res.status(400).json({
//           success: false,
//           message: `Invalid range in plan index ${i}`,
//         });
//       }

//       if (!["flat", "percent"].includes(type)) {
//         return res.status(400).json({
//           success: false,
//           message: `Invalid type in plan index ${i}`,
//         });
//       }

//       if (type === "percent" && commission > 100) {
//         return res.status(400).json({
//           success: false,
//           message: `Commission cannot exceed 100% in plan index ${i}`,
//         });
//       }

//       // check overlap inside request
//       if (i > 0) {
//         const prev = validatedPlans[i - 1];

//         if (from <= prev.to) {
//           return res.status(400).json({
//             success: false,
//             message: `Plan overlaps with previous range at index ${i}`,
//           });
//         }
//       }

//       validatedPlans.push({
//         from: from,
//         to: to,
//         commission: commission,
//         type,
//       });
//     }

//     // validate package
//     const isValidPackage = await Package.findOne({
//       _id: packageId,
//       isActive: true,
//       isDeleted: false,
//     });

//     if (!isValidPackage) {
//       return res.status(404).json({
//         success: false,
//         message: "Package Not Found",
//       });
//     }

//     // validate service
//     const isValidService = await Service.findOne({
//       _id: serviceId,
//       isActive: true,
//       isDeleted: false,
//     });

//     if (!isValidService) {
//       return res.status(404).json({
//         success: false,
//         message: "Service Not Found",
//       });
//     }

//     // validate operator
//     if (operatorId) {
//       const isValidOperator = await Operator.findOne({
//         _id: operatorId,
//         isActive: true,
//         isDeleted: false,
//       });

//       if (!isValidOperator) {
//         return res.status(404).json({
//           success: false,
//           message: "Operator Not Found",
//         });
//       }
//     }

//     // validate category
//     if (categoryId) {
//       const isValidCategory = await BbpsCategory.findOne({
//         _id: categoryId,
//         isActive: true,
//         isDeleted: false,
//       });

//       if (!isValidCategory) {
//         return res.status(404).json({
//           success: false,
//           message: "Category Not Found",
//         });
//       }
//     }

//     // check if commission already exists
//     let commissionDoc = await Commission.findOne({
//       packageId,
//       serviceId,
//       operatorId: operatorId || null,
//       categoryId: categoryId || null,
//     });

//     if (!commissionDoc) {
//       // create new commission
//       commissionDoc = await Commission.create({
//         packageId,
//         serviceId,
//         operatorId: operatorId || null,
//         categoryId: categoryId || null,
//         plan: validatedPlans,
//       });

//       return res.status(201).json({
//         success: true,
//         message: "Commission Created Successfully",
//       });
//     }

//     let isAnyChange = false;

//     for (let newPlan of validatedPlans) {
//       let isUpdated = false;

//       for (let i = 0; i < commissionDoc.plan.length; i++) {
//         let oldPlan = commissionDoc.plan[i];

//         if (oldPlan.isDeleted) continue;

//         // ✅ SAME RANGE → UPDATE
//         if (oldPlan.from === newPlan.from && oldPlan.to === newPlan.to) {
//           if (
//             oldPlan.commission !== newPlan.commission ||
//             oldPlan.type !== newPlan.type
//           ) {
//             commissionDoc.plan[i].commission = newPlan.commission;
//             commissionDoc.plan[i].type = newPlan.type;
//             isAnyChange = true;
//           }
//           isUpdated = true;
//           break;
//         }

//         // ❌ OVERLAP → ERROR
//         if (newPlan.from <= oldPlan.to && newPlan.to >= oldPlan.from) {
//           return res.status(400).json({
//             success: false,
//             message: `Plan range ${paiseToRupee(newPlan.from)}-${paiseToRupee(newPlan.to)} overlaps with existing range`,
//           });
//         }
//       }

//       // ✅ INSERT NEW PLAN
//       if (!isUpdated) {
//         commissionDoc.plan.push(newPlan);
//         isAnyChange = true;
//       }
//     }

//     // ✅ sort (important)
//     commissionDoc.plan.sort((a, b) => a.from - b.from);

//     if (!isAnyChange) {
//       return res.status(200).json({
//         success: true,
//         message: "No changes detected",
//       });
//     }

//     await commissionDoc.save();

//     return res.status(200).json({
//       success: true,
//       message: "Commission Updated Successfully",
//     });
//   } catch (error) {
//     next(error);
//   }
// };

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
