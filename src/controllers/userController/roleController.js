const Role = require("../../models/roleModel");

exports.getUserRoles = async (req, res) => {
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
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}