const Role = require("../../models/roleModel");

exports.getUserRoles = async (req, res, next) => {
  try {
    const roles = await Role.find({ isActive: true, isDeleted: false });
    return res.status(200).json({
      success: true,
      message: "Roles fetched successfully",
      data: roles,
    });
  } catch (error) {
    next(error);
  }
};

exports.createRole = async (req, res, next) => {
  try {
    const { name, roleCode, level, onBoardCharge } = req.body;

    if (!name || !roleCode || !level || onBoardCharge == undefined) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const role = await Role.findOne({ name: name, roleCode: roleCode });

    if (role) {
      return res
        .status(400)
        .json({ success: false, message: "Role already exists" });
    }

    const newRole = new Role({
      name,
      roleCode,
      level,
      onBoardCharge,
    });

    await newRole.save();
    return res
      .status(201)
      .json({ success: true, message: "Role created successfully" });
  } catch (error) {
    next(error);
  }
};
