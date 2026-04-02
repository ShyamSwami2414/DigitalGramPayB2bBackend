const Kyc = require("../../models/kycModel");
const User = require("../../models/userModel");
const Setting = require("../../models/settingModel");
const { validateAadhar } = require("../../helpers/validateAadhar");
const mongoose = require("mongoose");

exports.getSubmittedKyc = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const kyc = await Kyc.findOne({ userId: userId }).lean();

    return res
      .status(200)
      .json({ success: true, message: "KYC Fetched", data: kyc });
  } catch (error) {
    next(error);
  }
};

exports.offlineKycSubmission = async (req, res, next) => {
  try {
    const setting = await Setting.findOne();
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: "Setting not found",
      });
    }

    if (setting.isKycOnline) {
      return res.status(400).json({
        success: false,
        message: "Offline KYC is not enabled",
      });
    }

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

      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
    };

    const missingFields = [];

    for (const [key, value] of Object.entries(requiredFields)) {
      if (
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0)
      ) {
        missingFields.push(key);
      }
    }

    // for (const [key, value] of Object.entries(requiredFields)) {
    //   if (!value || value.toString().trim() === "") {
    //     missingFields.push(key);
    //   }
    // }

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

      firstName: firstName?.trim(),
      lastName: lastName?.trim(),
      fatherName: fatherName?.trim(),
      gender: gender?.trim().toLowerCase(),

      email: email?.trim(),
      phone: phone?.trim(),
      dob,

      personalAddress: {
        address: personalAddress,
        city: personalCity,
        state: personalState,
        pincode: personalPincode,
      },

      shopName: shopName?.trim(),

      businessAddress: {
        address: businessAddress,
        city: businessCity,
        state: businessState,
        pincode: businessPincode,
      },

      businessPanNumber,
      gstNumber,

      aadharNumber,
      panNumber,

      accountHolderName: accountHolderName?.trim(),
      bankName: bankName?.trim(),
      branchName: branchName?.trim(),
      accountNumber: accountNumber?.trim(),
      ifscCode: ifscCode?.trim(),

      aadharFileUrl: `/uploads/kyc/${aadharFile.filename}`,
      panFileUrl: `/uploads/kyc/${panFile.filename}`,
      shopImageUrl: `/uploads/kyc/${shopImage.filename}`,
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

exports.sendAadharOtpForOnlineKyc = async (req, res, next) => {
  try {
    const setting = await Setting.findOne();
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: "Setting not found",
      });
    }

    if (!setting.isKycOnline) {
      return res.status(400).json({
        success: false,
        message: "Online KYC is not enabled",
      });
    }

    console.log(
      req.user,
      "is sending Aadhar OTP for Online KYC with data:",
      req.body,
    );

    const { aadharNumber } = req.body;

    if (!aadharNumber) {
      return res.status(400).json({
        success: false,
        message: "Aadhar number is required",
      });
    }

    if (!validateAadhar(aadharNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Aadhar number",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Aadhar OTP sent successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyAadharOtpForOnlineKyc = async (req, res, next) => {
  try {
    const setting = await Setting.findOne();
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: "Setting not found",
      });
    }

    if (!setting.isKycOnline) {
      return res.status(400).json({
        success: false,
        message: "Online KYC is not enabled",
      });
    }

    console.log(
      req.user,
      "is verifying Aadhar OTP for Online KYC with data:",
      req.body,
    );

    const { aadharOtp } = req.body;

    if (!aadharOtp) {
      return res.status(400).json({
        success: false,
        message: "Aadhar OTP is required",
      });
    }

    const kycData = await Kyc.findOne({
      userId: req.user.id,
    });

    if (!kycData) {
      return res.status(404).json({
        success: false,
        message: "KYC data not found",
      });
    }

    if (kycData.aadharOtp !== aadharOtp) {
      return res.status(400).json({
        success: false,
        message: "Aadhar OTP does not match",
      });
    }

    kycData.isAadharOtpVerified = true;
    await kycData.save();

    return res.status(200).json({
      success: true,
      message: "Aadhar OTP verified successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.onlineKycSubmission = async (req, res, next) => {
  try {
    const setting = await Setting.findOne();
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: "Setting not found",
      });
    }

    if (!setting.isKycOnline) {
      return res.status(400).json({
        success: false,
        message: "Online KYC is not enabled",
      });
    }

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

exports.reuploadKycSections = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let { sections } = req.body;

    sections = typeof sections === "string" ? JSON.parse(sections) : sections;

    console.log(sections, "sections");

    if (!Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Sections array is required",
      });
    }

    const kyc = await Kyc.findOne({
      userId,
      isDeleted: false,
      status: { $ne: "approved" },
    });

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC not found",
      });
    }

    const files = req.files || {};

    console.log("files", files);

    const updateFields = {};
    const updatedSections = [];
    const failedSections = [];

    for (const item of sections) {
      let { section, data } = item;

      console.log(section, "section");
      console.log(data, "data");

      section = section?.trim()?.toLowerCase();

      if (!section || !data) {
        failedSections.push(section || "unknown");
        continue;
      }

      console.log(failedSections, "failedSections");

      // ================= PERSONAL =================
      if (section === "personal") {
        console.log("Personal Section Entered");

        if (kyc.personalDetailStatus !== "rejected") {
          failedSections.push("personal");
          continue;
        }

        //  required fields validation
        const required = [
          "firstName",
          "lastName",
          "fatherName",
          "email",
          "phone",
          "dob",
          "gender",
        ];

        let isInvalid = false;

        for (let field of required) {
          if (!data[field]) {
            failedSections.push(`personal (${field} missing)`);
            isInvalid = true;
          }
        }

        //  normalize address (based on your frontend format)
        const personalAddress = {
          address: data.personalAddress,
          city: data.personalCity,
          state: data.personalState,
          pincode: data.personalPincode,
        };

        if (
          !personalAddress.address ||
          !personalAddress.city ||
          !personalAddress.state ||
          !personalAddress.pincode
        ) {
          failedSections.push("personal (address incomplete)");
          isInvalid = true;
        }

        if (isInvalid) continue;

        //  correct mapping
        Object.assign(updateFields, {
          firstName: data.firstName,
          lastName: data.lastName,
          fatherName: data.fatherName,
          email: data.email,
          phone: data.phone,
          dob: data.dob,
          gender: data.gender,
          personalAddress,
          personalDetailStatus: "pending",
        });

        updatedSections.push("personal");
      }

      // ================= BUSINESS =================
      if (section === "business") {
        if (kyc.businessDetailStatus !== "rejected") {
          failedSections.push("business");
          continue;
        }

        const shopImage = files.shopImage?.[0];

        console.log("shopImage:", shopImage);

        //  normalize incoming data
        const businessAddress = {
          address: data.businessAddress,
          city: data.businessCity,
          state: data.businessState,
          pincode: data.businessPincode,
        };

        if (
          !data.shopName ||
          !businessAddress.address ||
          !businessAddress.city ||
          !businessAddress.state ||
          !businessAddress.pincode
        ) {
          failedSections.push("business (missing fields)");
          continue;
        }

        Object.assign(updateFields, {
          shopName: data.shopName,
          businessAddress,
          businessPanNumber: data.businessPanNumber || null,
          gstNumber: data.gstNumber || null,
          shopImageUrl: `/uploads/kyc/${shopImage.filename}`,
          businessDetailStatus: "pending",
        });

        updatedSections.push("business");
      }

      // ================= BANK =================
      if (section === "bank") {
        if (kyc.bankDetailStatus !== "rejected") {
          failedSections.push("bank");
          continue;
        }

        const required = [
          "accountHolderName",
          "bankName",
          "branchName",
          "accountNumber",
          "ifscCode",
        ];

        for (let field of required) {
          if (!data[field]) {
            failedSections.push(`bank (${field} missing)`);
            continue;
          }
        }

        Object.assign(updateFields, {
          ...data,
          bankDetailStatus: "pending",
        });

        updatedSections.push("bank");
      }

      // ================= IDENTITY =================
      if (section === "identity") {
        if (kyc.identityDetailStatus !== "rejected") {
          failedSections.push("identity");
          continue;
        }

        const aadharFile = files.aadharFile?.[0];
        const panFile = files.panFile?.[0];

        if (!data.aadharNumber || !data.panNumber || !aadharFile || !panFile) {
          failedSections.push("identity (missing fields/files)");
          continue;
        }

        Object.assign(updateFields, {
          aadharNumber: data.aadharNumber,
          panNumber: data.panNumber,
          aadharFileUrl: `/uploads/kyc/${aadharFile.filename}`,
          panFileUrl: `/uploads/kyc/${panFile.filename}`,
          identityDetailStatus: "pending",
        });

        updatedSections.push("identity");
      }
    }

    console.log("updatedSections", updatedSections);

    if (updatedSections.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid sections updated",
        failedSections,
      });
    }

    updateFields.status = "pending";
    updateFields.rejectionReason = "";

    const updatedKyc = await Kyc.findByIdAndUpdate(
      kyc._id,
      { $set: updateFields },
      { new: true, runValidators: true },
    );

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: userId,
        isActive: true,
      },
      {
        $set: {
          kycStatus: "submitted",
        },
      },
      {
        new: true,
      },
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "KYC reuploaded successfully",
      updatedSections,
      failedSections,
      data: updatedKyc,
    });
  } catch (error) {
    next(error);
  }
};
