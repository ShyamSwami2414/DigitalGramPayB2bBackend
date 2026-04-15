const Permission = require("../models/permissionModel");

const checkAllowedPermission = (requiredPermissions = []) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      //  Convert string → array
      if (!Array.isArray(requiredPermissions)) {
        requiredPermissions = [requiredPermissions];
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: No user found",
        });
      }

      if (!user.type) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User type missing",
        });
      }

      if (!["admin", "employee"].includes(user.type)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Invalid user type",
        });
      }

      //  Super admin bypass
      if (user.type === "admin" && user.permissionIds.length === 0) {
        return next();
      }

      if (user.type === "employee") {
        if (
          !Array.isArray(user.permissionIds) ||
          user.permissionIds.length === 0
        ) {
          return res.status(403).json({
            success: false,
            message: "Forbidden: No permissions assigned",
          });
        }

        const permissions = await Permission.find({
          _id: { $in: user.permissionIds },
          isActive: true,
        }).select("name");

        const permissionNames = permissions.map((p) => p.name);

        const hasPermission = requiredPermissions.some((perm) =>
          permissionNames.includes(perm),
        );

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: `Forbidden: Missing required permissions`,
          });
        }
      }

      next();
    } catch (error) {
      console.error("Authorization Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error in authorization",
      });
    }
  };
};

module.exports = checkAllowedPermission;
