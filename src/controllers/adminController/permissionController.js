const Permission = require("../../models/permissionModel");

exports.getPermissionList = async (req, res, next) => {
    try {
        const permissions = await Permission.
            find({ isActive: true }).
            select("name ");

        res.status(200).json({
            success: true,
            message: "Permissions fetched successfully",
            data: permissions,
        });
    } catch (error) {
        next(error);
    }
}