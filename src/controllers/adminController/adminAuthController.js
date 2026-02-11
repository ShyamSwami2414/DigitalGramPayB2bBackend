exports.adminLogin = async (req, res) => {
    try {
        console.log("Admin Login");

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};