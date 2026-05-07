const Role = require("../../models/roleModel");
const { paiseToRupee } = require("../../utils/money");

//for signup menu
exports.getRoleListForSignUp = async (req, res, next) => {
  try {
    const roles = await Role.find({
      isActive: true,
      isDeleted: false,
    }).select("name");

    return res.status(200).json({
      success: true,
      message: "Role List fetched successfully",
      data: roles,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserRoles = async (req, res, next) => {
  try {
    const role = await Role.findById(req.user.role).select("level").lean();
    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }
    const roles = await Role.find({
      isActive: true,
      isDeleted: false,
      level: { $gt: role.level },
    }).lean();

    const formattedData = roles.map((role) => ({
      ...role,
      onBoardCharge: paiseToRupee(role?.onBoardCharge),
    }));

    return res.status(200).json({
      success: true,
      message: "Roles fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};
