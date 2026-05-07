const Service = require("../models/serviceModel");

const validatePipeline = (pipelineCode) => {
  return async (req, res, next) => {
    try {
      if (!pipelineCode || typeof pipelineCode !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid pipeline configuration",
        });
      }

      const service = await Service.findOne({
        isActive: true,
        isDeleted: false,
        pipeline: {
          $elemMatch: {
            code: pipelineCode,
            isActive: true,
          },
        },
      })
        .select("_id name serviceCode pipeline")
        .lean();

      if (!service) {
        return res.status(403).json({
          success: false,
          message: "Service temporarily unavailable",
        });
      }

      const pipeline = service.pipeline.find(
        (item) => item.code === pipelineCode && item.isActive === true,
      );

      if (!pipeline) {
        return res.status(403).json({
          success: false,
          message: "Pipeline disabled",
        });
      }

      req.pipeline = pipeline;
      req.service = service;

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = validatePipeline;
