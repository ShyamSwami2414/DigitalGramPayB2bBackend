const Role = require("../../models/roleModel");

exports.getRoleListForSignUp = async (req, res, next) => {
    try {
        const roles = await Role.find({
            isActive: true,
            isDeleted: false
        }).select("name");

        return res.status(200).json({
            success: true,
            message: "Role List fetched successfully",
            data: roles
        });
    } catch (error) {
        next(error);
    }
}

exports.getUserRoles = async (req, res, next) => {
    try {
        console.log(req.user, "user");
        const roles = await Role.find({
            isActive: true,
            isDeleted: false,
            level: { $gt: req.user.level }
        });

        return res.status(200).json({
            success: true,
            message: "Roles fetched successfully",
            data: roles
        });
    } catch (error) {
        next(error);
    }
}