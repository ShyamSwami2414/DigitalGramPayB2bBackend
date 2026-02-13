const Package = require("../../models/packageModel");
const { generateRoleCode } = require("../../utils/generateRoleCode");

exports.createPackage = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const roleCode = await generateRoleCode(name);

    const existingPackage = await Package.findOne({
      name: name,
      roleCode: roleCode,
      isActive: true,
      isDeleted: false,
    });

    if (existingPackage) {
      return res
        .status(400)
        .json({ success: false, message: "Package already exists" });
    }

    const newPackage = new Package({
      name,
      roleCode,
    });

    await newPackage.save();

    return res.status(201).json({
      success: true,
      message: "Package created successfully",
      data: newPackage,
    });
  } catch (error) {
    console.error("Error creating package:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getAllPackages = async (req, res) => {
  try {
    const packages = await Package.find({ isActive: true, isDeleted: false });
    return res.status(200).json({
      success: true,
      message: "Packages fetched successfully",
      data: packages,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
