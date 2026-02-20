const Setting = require("../../models/settingModel");
const path = require("path");
const fs = require("fs");

exports.getSetting = async (req, res, next) => {
    try {
        const setting = await Setting.findOne();
        if (!setting) {
            return res.status(404).json({
                success: false,
                message: "Setting not found"
            });
        }
        return res.status(200).json({
            success: true,
            message: "Setting fetched successfully",
            setting
        });

    } catch (error) {
        next(error);
    }
}

exports.createSetting = async (req, res, next) => {
    try {
        console.log("Creating setting with:", req.body, req.files);

        const logoFile = req.files?.logo?.[0];
        const faviconFile = req.files?.favicon?.[0];
        const qrCodeFile = req.files?.qrCode?.[0];

        let {
            requireAdminApprovalForCredentials,
            title,
            email,
            phone,
            address,
        } = req.body;

        console.log(req.body, "body")

        requireAdminApprovalForCredentials = requireAdminApprovalForCredentials.trim() === "true";

        const requiredFields = {
            requireAdminApprovalForCredentials,
            title,
            email,
            phone,
            address,
        };

        const missingFields = [];

        for (const [key, value] of Object.entries(requiredFields)) {
            if (value === undefined || value === null || value.toString().trim() === "") {
                missingFields.push(key);
            }
        }

        // if (!logoFile) missingFields.push("logo");
        // if (!faviconFile) missingFields.push("favicon");
        // if (!qrCodeFile) missingFields.push("qrCode");

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `${missingFields.join(", ")} are required`,
                missingFields,
            });
        }

        const existingSetting = await Setting.findOne();
        if (existingSetting) {
            return res.status(400).json({
                success: false,
                message: "Setting already exists",
            });
        }

        const newSetting = new Setting({
            requireAdminApprovalForCredentials,
            title,
            email,
            phone,
            address,

            logoUrl: `/uploads/settings/${logoFile?.filename}`,
            faviconUrl: `/uploads/settings/${faviconFile?.filename}`,
            qrCodeUrl: `/uploads/settings/${qrCodeFile?.filename}`,
        });

        await newSetting.save();

        return res.status(201).json({
            success: true,
            message: "Setting created successfully",
            data: newSetting,
        });

    } catch (error) {
        next(error);
    }
};


exports.updateSetting = async (req, res, next) => {
    try {
        console.log("Updating setting with:", req.body, req.files);

        const setting = await Setting.findOne();
        if (!setting) {
            return res.status(404).json({
                success: false,
                message: "Setting not found",
            });
        }

        const logoFile = req.files?.logo?.[0];
        const faviconFile = req.files?.favicon?.[0];
        const qrCodeFile = req.files?.qrCode?.[0];

        const {
            requireAdminApprovalForCredentials,
            title,
            email,
            phone,
            address,
        } = req.body;


        const updateData = {};

        if (requireAdminApprovalForCredentials !== undefined)
            updateData.requireAdminApprovalForCredentials =
                requireAdminApprovalForCredentials;

        if (title) updateData.title = title.trim();
        if (email) updateData.email = email.trim();
        if (phone) updateData.phone = phone.trim();
        if (address) updateData.address = address.trim();

        const fs = require("fs");
        const path = require("path");

        const deleteOldFile = (filePath) => {
            if (!filePath) return;

            const cleanPath = filePath.replace(/^\/+/, "");

            const fullPath = path.join(process.cwd(), cleanPath);

            console.log("Trying to delete:", fullPath);

            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                console.log("Deleted successfully");
            } else {
                console.log("File not found");
            }
        };

        if (logoFile) {
            deleteOldFile(setting.logoUrl);
            updateData.logoUrl = `/uploads/settings/${logoFile.filename}`;
        }

        if (faviconFile) {
            deleteOldFile(setting.faviconUrl);
            updateData.faviconUrl = `/uploads/settings/${faviconFile.filename}`;
        }

        if (qrCodeFile) {
            deleteOldFile(setting.qrCodeUrl);
            updateData.qrCodeUrl = `/uploads/settings/${qrCodeFile.filename}`;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No data provided for update",
            });
        }

        const updatedSetting = await Setting.findByIdAndUpdate(
            setting._id,
            updateData,
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: "Setting updated successfully",
            data: updatedSetting,
        });

    } catch (error) {
        next(error);
    }
};