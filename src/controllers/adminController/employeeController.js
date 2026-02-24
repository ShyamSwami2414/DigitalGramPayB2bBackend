const mongoose = require("mongoose");
const Admin = require("../../models/adminModel");
const Permission = require("../../models/permissionModel");
const { generateAdminUsername } = require("../../utils/generateAdminUsername");
const { generateUserPassword } = require("../../utils/generateUserPassword");
const { hashPassword } = require("../../utils/bcrypt");
const { generateWelcomeEmail } = require("../../templates/emailTemplates/welcomeEmail");
const { generateUniquePin } = require("../../utils/uniquePinGenerator");
const { sendEmail } = require("../../utils/email");

exports.getEmployeeById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Employee id is required",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid employee id",
            });
        }

        const employee = await Admin.findOne({ _id: id });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Employee fetched successfully",
            data: employee,
        });
    } catch (error) {
        next(error);
    }
}

exports.getEmployeeList = async (req, res, next) => {
    try {
        let { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const employees = await Admin.find({ type: "employee" }).
            select("name email phone type level").
            sort({ createdAt: -1 });

        const total = await Admin.countDocuments({ type: "employee" });

        res.status(200).json({
            success: true,
            message: "Employee list fetched successfully",
            data: employees,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            }
        });
    } catch (error) {
        next(error);
    }
}

exports.addEmployee = async (req, res, next) => {
    try {
        let { name, email, phone, permissions } = req.body;
        name = name?.trim();
        email = email?.trim();
        phone = phone?.trim();

        const requiredFields = ["name", "email", "phone", "permissions"];

        const missingFields = [];
        requiredFields.forEach((field) => {
            if (!req.body[field]) {
                missingFields.push(field);
            }
        });

        // if (permissions.length === 0) {
        //     missingFields.push("permissions");
        // }

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(", ")}`,
            });
        }

        const invalidPermissions = permissions.filter((permission) => {
            return !mongoose.Types.ObjectId.isValid(permission);
        });

        if (invalidPermissions.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Invalid permissions ids: ${invalidPermissions.join(", ")}`,
            });
        }

        const isPermissionExists = await Permission.find({ _id: { $in: permissions } });

        if (isPermissionExists.length !== permissions.length) {
            return res.status(404).json({
                success: false,
                message: `Permission not found : ${permissions.join(", ")}`,
            });
        }

        const isEmployeeExists = await Admin.findOne({ email });

        if (isEmployeeExists) {
            return res.status(409).json({
                success: false,
                message: `Employee with this email already exists : ${email}`,
            });
        }

        const userName = await generateAdminUsername();
        const password = generateUserPassword();
        const hashedPassword = await hashPassword(password);
        const pin = generateUniquePin();

        const employee = await Admin.create({
            name,
            userName,
            email,
            password: hashedPassword,
            phone,
            permissionIds: permissions,
            type: "employee",
        });

        const html = generateWelcomeEmail({
            name: employee.name,
            email: employee.email,
            userName: employee.userName,
            password: password,
            pin: pin,
            loginUrl: "http://localhost:3000"
        });

        await sendEmail(employee.email, [], [], "Welcome to B2B", html);

        res.status(200).json({
            success: true,
            message: "Employee added successfully",
            data: {
                name,
                email,
                phone,
                permissions,
            }
        });
    } catch (error) {
        next(error);
    }
}

exports.updateEmployee = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, email, phone, permissions } = req.body;

        const requiredFields = ["name", "email", "phone", "permissions"];
        const missingFields = [];

        requiredFields.forEach((field) => {
            if (!req.body[field]) {
                missingFields.push(field);
            }
        });

        // if (permissions.length === 0) {
        //     missingFields.push("permissions");
        // }

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(", ")}`,
            });
        }

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Employee id is required",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid employee id",
            });
        }

        const invalidPermissions = permissions.filter((permission) => {
            return !mongoose.Types.ObjectId.isValid(permission);
        });

        if (invalidPermissions.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Invalid permissions ids: ${invalidPermissions.join(", ")}`,
            });
        }

        const isPermissionExists = await Permission.find({ _id: { $in: permissions } });

        if (isPermissionExists.length !== permissions.length) {
            return res.status(404).json({
                success: false,
                message: `Permission not found : ${permissions.join(", ")}`,
            });
        }

        const updateData = {
            name,
            email,
            phone,
            permissionIds: permissions,
        };

        const employee = await Admin.findOneAndUpdate(
            { _id: id },
            updateData,
            { new: true }
        );

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Employee updated successfully",
            data: employee,
        });
    } catch (error) {
        next(error);
    }
}

exports.deleteEmployee = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Employee id is required",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid employee id",
            });
        }

        const employee = await Admin.findOneAndUpdate(
            {
                _id: id,
                type: "employee",

            },
            {
                $set: {
                    isDeleted: true,
                    deletedAt: new Date()
                }
            },
            { new: true }
        );

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Employee deleted successfully",
        });
    } catch (error) {
        next(error);
    }
}
