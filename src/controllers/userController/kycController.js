exports.kycSubmission = async (req, res) => {
    try {
        const { firstName, lastName, fatherName, gender, email, phone, address, city, state, pincode, shopName, businessPanNumber, gstNumber, aadharNumber, aadharImage, panNumber, panImage, shopImage } = req.body;

        if (!firstName ||
            !lastName ||
            !fatherName ||
            !gender ||
            !email ||
            !phone ||
            !address ||
            !city ||
            !state ||
            !pincode ||
            !shopName ||
            !businessPanNumber ||
            !gstNumber ||
            !aadharNumber ||
            !aadharImage ||
            !panNumber ||
            !panImage ||
            !shopImage) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }


    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Internal server error" });

    }

}
