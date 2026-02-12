const User = require("../../models/userModel")
const Role = require("../../models/roleModel")
const bcrypt = require("../../utils/bcrypt");
const { generateToken, } = require("../../utils/jwt");
const { generateUniquePin } = require("../../utils/uniquePinGenerator");
const { generateUsername } = require("../../utils/generateUsername");
const { generateWelcomeEmail } = require("../../templates/emailTemplates/welcomeEmail");
const mongoose = require("mongoose");
const { sendEmail } = require("../../utils/email");

exports.userRegister = async (req, res) => {
    try {
        const { firstName, lastName, phone, role, email, password } = req.body

        if (!firstName || !lastName || !phone || !role || !email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        if (!mongoose.Types.ObjectId.isValid(role)) {
            return res.status(400).json({ success: false, message: "Invalid role ID" });
        }

        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        const isRoleValid = await Role.findOne({ _id: role, isActive: true, isDeleted: false });
        if (!isRoleValid) {
            return res.status(404).json({ success: false, message: "Role not found" });
        }

        const pin = generateUniquePin();
        const userName = await generateUsername();

        const hashedPassword = await bcrypt.hashPassword(password);

        const newUser = new User({
            firstName,
            lastName,
            userName: userName,
            phone,
            roleId: role,
            email,
            pin: pin,
            password: hashedPassword,
        });

        const html = generateWelcomeEmail({
            name: firstName + " " + lastName,
            email,
            userName: userName,
            password,
            pin,
            loginUrl: "http://localhost:8000/user-login"
        })

        sendEmail(email, [], [], "Welcome to Camlenio Software", html);

        await newUser.save();
        return res.status(201).json({ success: true, message: "User registered successfully" });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

exports.userLogin = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "Invalid Credentials" });
        }

        const isPasswordValid = await bcrypt.comparePassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Invalid Credentials" });
        }

        const token = generateToken({ id: user._id });

        res.status(200).json({ success: true, message: "User logged in successfully", user, token });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

