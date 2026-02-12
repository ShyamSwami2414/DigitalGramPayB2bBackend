const Admin = require("../../models/adminModel")
const bcrypt = require("../../utils/bcrypt");
const { generateToken } = require("../../utils/jwt");

exports.adminRegister = async (req, res) => {
    try {
        const { name, userName, phone, email, password } = req.body

        if (!name || !userName || !phone || !email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const admin = await Admin.findOne({ email });
        if (admin) {
            return res.status(400).json({ success: false, message: "Admin already exists" });
        }

        const hashedPassword = await bcrypt.hashPassword(password);
        const newAdmin = new Admin({
            name,
            userName,
            phone,
            email,
            password: hashedPassword,
        });

        await newAdmin.save();
        return res.status(201).json({ success: true, message: "Admin registered successfully" });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

exports.superAdminLogin = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(404).json({ success: false, message: "Invalid Credentials" });
        }

        const isPasswordValid = await bcrypt.comparePassword(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Invalid Credentials" });
        }

        const token = generateToken({ id: admin._id });

        res.status(200).json({ success: true, message: "Admin logged in successfully", token });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};