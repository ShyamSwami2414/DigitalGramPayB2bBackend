const Kyc = require("../../models/kycModel");

exports.kycSubmission = async (req, res) => {
  try {
    console.log(req.user, "is submitting KYC with data:", req.body, "and files:", req.files);
    const aadharFile = req.files?.aadharFile?.[0];
    const panFile = req.files?.panFile?.[0];
    const shopImage = req.files?.shopImage?.[0];

    const {
      firstName,
      lastName,
      fatherName,
      gender,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      shopName,
      businessPanNumber,
      gstNumber,
      aadharNumber,
      panNumber,
    } = req.body;

    if (
      !firstName ||
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
      !panNumber ||
      !aadharFile ||
      !panFile ||
      !shopImage
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const kycData = new Kyc({
      userId: req.user.id,
      firstName,
      lastName,
      fatherName,
      gender,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      shopName,
      businessPanNumber,
      gstNumber,
      aadharNumber,
      panNumber,
      aadharFileUrl: aadharFile ? `/uploads/kyc/${aadharFile?.filename}` : null,
      panFileUrl: panFile ? `/uploads/kyc/${panFile?.filename}` : null,
      shopImageUrl: shopImage ? `/uploads/kyc/${shopImage?.filename}` : null,
    });

    await kycData.save();

    return res.status(200).json({
      success: true,
      message: "KYC submitted successfully and is pending for review",
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
