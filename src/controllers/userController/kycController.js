const Kyc = require("../../models/kycModel");
const User = require("../../models/userModel");

exports.kycSubmission = async (req, res, next) => {
  try {
    console.log(
      req.user,
      "is submitting KYC with data:",
      req.body,
      "and files:",
      req.files,
    );
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
      dob,
      personalAddress,
      personalCity,
      personalState,
      personalPincode,

      shopName,
      businessAddress,
      businessCity,
      businessState,
      businessPincode,
      businessPanNumber,
      gstNumber,

      aadharNumber,
      panNumber,

      accountHolderName,
      bankName,
      branchName,
      accountNumber,
      ifscCode,
    } = req.body;

    const requiredFields = {
      firstName,
      lastName,
      fatherName,
      gender,
      email,
      phone,
      dob,
      personalAddress,
      personalCity,
      personalState,
      personalPincode,

      shopName,
      businessAddress,
      businessCity,
      businessState,
      businessPincode,

      aadharNumber,
      panNumber,
    };

    const missingFields = [];

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value || value.toString().trim() === "") {
        missingFields.push(key);
      }
    }

    // check files separately
    if (!aadharFile) missingFields.push("aadharFile");
    if (!panFile) missingFields.push("panFile");
    if (!shopImage) missingFields.push("shopImage");

    // check bank details
    if (!accountHolderName) missingFields.push("accountHolderName");
    if (!bankName) missingFields.push("bankName");
    if (!accountNumber) missingFields.push("accountNumber");
    if (!ifscCode) missingFields.push("ifscCode");
    if (!branchName) missingFields.push("branchName");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${missingFields.join(", ")} are required`,
        missingFields,
      });
    }

    const today = new Date();

    if (new Date(dob) > today) {
      return res.status(400).json({ message: "DOB cannot be future" });
    }

    const kycData = new Kyc({
      userId: req.user.id,
      firstName,
      lastName,
      fatherName,
      gender,
      email,
      phone,
      dob,
      personalAddress: {
        address: personalAddress,
        city: personalCity,
        state: personalState,
        pincode: personalPincode,
      },

      aadharNumber,
      panNumber,

      shopName,
      businessAddress: {
        address: businessAddress,
        city: businessCity,
        state: businessState,
        pincode: businessPincode,
      },

      businessPanNumber,
      gstNumber,

      accountHolderName,
      bankName,
      branchName,
      accountNumber,
      ifscCode,

      aadharFileUrl: aadharFile ? `/uploads/kyc/${aadharFile?.filename}` : null,
      panFileUrl: panFile ? `/uploads/kyc/${panFile?.filename}` : null,
      shopImageUrl: shopImage ? `/uploads/kyc/${shopImage?.filename}` : null,
    });

    await kycData.save();

    await User.findByIdAndUpdate(req.user.id, {
      kycStatus: "submitted",
    });

    return res.status(200).json({
      success: true,
      message: "KYC submitted successfully and is pending for review",
    });
  } catch (error) {
    next(error);
  }
};
