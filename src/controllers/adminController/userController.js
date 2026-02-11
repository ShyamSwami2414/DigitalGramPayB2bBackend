exports.getAllUsers = async (req, res) => {
    try {
        console.log("Get All Users");
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};