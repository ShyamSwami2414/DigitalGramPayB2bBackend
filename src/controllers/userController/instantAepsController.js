const mongoose = require("mongoose");
const InstantAepsOutlet = require("../../models/instantAepsOutletModel");
const Merchant = require("../../models/instantAepsOutletModel");
const InstantBank = require("../../models/instantAepsBank");
const {
  instantAepsOutletRegister,
  checkBiometricKycStatus,
  biometricKyc,
  dailyLogin,
  doBalanceEnquiry,
  doMiniStatement,
  doCashWithdraw,
} = require("../../services/instantAepsService");
const { parseMantraXml } = require("../../helpers/formatMantraBiometricData");
const { encryptAadhaar } = require("../../helpers/encryptDecryptAadhar");
const {
  validateBiometricSchema,
} = require("../../validators/biometricDataValidator");
const { rupeeToPaise } = require("../../utils/money");

const registerOutlet = async (req, res, next) => {
  try {
    let {
      name,
      email,
      mobile,
      aadhaar,
      longitude,
      latitude,
      pan,
      dateOfBirth,
      gender,
      address,
    } = req.body;

    name = name?.trim();
    email = email?.trim()?.toLowerCase();
    mobile = mobile?.trim();
    aadhaar = aadhaar?.trim();
    pan = pan?.trim();
    dateOfBirth = dateOfBirth?.trim();
    gender = gender?.trim();
    latitude = Number(latitude);
    longitude = Number(longitude);

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = [
      "name",
      "email",
      "mobile",
      "aadhaar",
      "latitude",
      "longitude",
      "pan",
      "dateOfBirth",
      "gender",
      "address",
    ];

    const missingFields = [];

    requiredFields.forEach((field) => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${missingFields.join(", ")} is required`,
      });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email format" });
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid mobile number" });
    }

    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(aadhaar)) {
      return res
        .status(400)
        .json({ success: false, message: "Aadhaar must be 12 digits" });
    }

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(pan)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid PAN format" });
    }

    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid date of birth" });
    }

    const age = new Date().getFullYear() - dob.getFullYear();
    if (age < 18) {
      return res.status(400).json({
        success: false,
        message: "User must be at least 18 years old",
      });
    }

    if (!["M", "F", "O"].includes(gender)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gender",
      });
    }

    // Check NaN
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: "Latitude and Longitude must be valid numbers",
      });
    }

    // Range validation
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude (must be between -90 and 90)",
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid longitude (must be between -180 and 180)",
      });
    }

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    const isMerchantExist = await Merchant.findOne({
      userId: userId,
      email: email,
    });

    if (isMerchantExist) {
      return res.status(200).json({
        success: true,
        message: "User already onboarded",
      });
    }

    const response = await instantAepsOutletRegister({
      userId,
      requestId: idempotency,
      name,
      email,
      mobile,
      aadhaar,
      longitude,
      latitude,
      pan,
      dateOfBirth,
      gender,
      address,
    });

    console.log(response, "response");

    if (response && response.status_code === "TXN") {
      const data = response?.data?.data;

      const outletAlreadyExist = await InstantAepsOutlet.findOne({
        outletId: data?.outletId,
      });

      if (outletAlreadyExist) {
        return res.status(400).json({
          success: false,
          message: "User already registered with another email",
        });
      }

      const outletRegister = new InstantAepsOutlet({
        userId: userId,
        outletId: data?.outletId,
        name: data?.name,
        email: email,
        mobile: mobile,
        aadhaar: aadhaar,
        pan: pan,
        dateOfBirth: data?.dateOfBirth,
        gender: data?.gender,
        longitude: longitude,
        latitude: latitude,
        address: {
          address: data?.address,
          city: data?.city,
          state: data?.state,
          pincode: data?.pincode,
        },
        profilePic: data?.profilePic,
      });

      await outletRegister.save();
      return res.status(201).json({
        success: true,
        data: response,
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

const getBiometricKycStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    const response = await checkBiometricKycStatus({
      userId,
      requestId: idempotency,
    });

    console.log(response, "response");

    if (response && response?.status_code === "TXN") {
      const data = response?.data?.data;

      console.log(data, "data");
    }

    return res.status(200).json({
      success: true,
      // data: response,
      data: {
        message: response?.message,
        action: response?.data?.data?.action,
      },
    });
  } catch (error) {
    next(error);
  }
};

const completetBiometricKyc = async (req, res, next) => {
  try {
    let {
      latitude,
      longitude,
      captureType = "FINGER",
      biometricData,
    } = req.body;

    latitude = Number(latitude);
    longitude = Number(longitude);
    captureType = captureType?.trim().toUpperCase();

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = [
      "latitude",
      "longitude",
      "captureType",
      "biometricData",
    ];

    const missingFields = [];

    requiredFields.forEach((field) => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${missingFields.join(", ")} is required`,
      });
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: "Latitude and Longitude must be valid numbers",
      });
    }

    // Range validation
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude (must be between -90 and 90)",
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid longitude (must be between -180 and 180)",
      });
    }

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    if (!["FINGER", "FACE", "IRIS"].includes(captureType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Capture type",
      });
    }

    if (!biometricData) {
      return res
        .status(400)
        .json({ success: false, message: "Biometric data is required" });
    }

    let finalBiometricJson;

    if (
      typeof biometricData === "string" &&
      biometricData.trim().startsWith("<?xml")
    ) {
      // Input is XML string - Transform it
      try {
        finalBiometricJson = await parseMantraXml(biometricData);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Biometric XML is malformed.",
          error: error.message,
        });
      }
    } else if (typeof biometricData === "object" && biometricData !== null) {
      // Input is already JSON - Use as is (assuming it matches your schema)
      finalBiometricJson = biometricData;
    } else {
      return res.status(400).json({
        success: false,
        message:
          "Invalid biometricData format. Expected XML string or JSON object.",
      });
    }

    //  Device-Level Error Validation
    // errCode "0" means success in Mantra/UIDAI standards.
    if (finalBiometricJson.errCode !== "0") {
      return res.status(422).json({
        success: false,
        message: `Capture Failed: ${finalBiometricJson.errInfo || "No error info provided"}`,
        errorCode: finalBiometricJson.errCode,
      });
    }

    // console.log(finalBiometricJson, "finalBiometricJson");

    const response = await biometricKyc({
      userId,
      requestId: idempotency,
      latitude,
      longitude,
      captureType,
      biometricData: finalBiometricJson,
    });

    console.log(response, "response");

    if (response && response?.status_code === "TXN") {
      const data = response?.data;

      console.log(data, "data");

      const update = await Merchant.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId) },
        {
          $set: {
            status: "VERIFIED",
          },
        },
        { new: true, runValidators: true },
      );

      if (!update) {
        throw Error("Merchant not exist");
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        referenceId: response?.txn_ref,
        message: response?.message,
      },
    });
  } catch (error) {
    next(error);
  }
};

const dailyAepsLogin = async (req, res, next) => {
  try {
    let {
      aadhaar,
      latitude,
      longitude,
      captureType = "FINGER",
      biometricData,
    } = req.body;

    latitude = Number(latitude);
    longitude = Number(longitude);
    captureType = captureType?.trim().toUpperCase();
    aadhaar = aadhaar?.trim();

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = [
      "latitude",
      "longitude",
      "captureType",
      "biometricData",
      "aadhaar",
    ];

    const missingFields = [];

    requiredFields.forEach((field) => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${missingFields.join(", ")} is required`,
      });
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: "Latitude and Longitude must be valid numbers",
      });
    }

    // Range validation
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude (must be between -90 and 90)",
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid longitude (must be between -180 and 180)",
      });
    }

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    if (!["FINGER", "FACE", "IRIS"].includes(captureType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Capture type",
      });
    }

    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(aadhaar)) {
      return res
        .status(400)
        .json({ success: false, message: "Aadhaar must be 12 digits" });
    }

    const encryptedAadhaar = encryptAadhaar(aadhaar);

    if (!biometricData) {
      return res
        .status(400)
        .json({ success: false, message: "Biometric data is required" });
    }

    let finalBiometricJson;

    if (
      typeof biometricData === "string" &&
      biometricData.trim().startsWith("<?xml")
    ) {
      // Input is XML string - Transform it
      try {
        finalBiometricJson = await parseMantraXml(biometricData);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Biometric XML is malformed.",
          error: error.message,
        });
      }
    } else if (typeof biometricData === "object" && biometricData !== null) {
      // Input is already JSON - Use as is (assuming it matches your schema)
      finalBiometricJson = biometricData;
    } else {
      return res.status(400).json({
        success: false,
        message:
          "Invalid biometricData format. Expected XML string or JSON object.",
      });
    }

    //  Device-Level Error Validation
    // errCode "0" means success in Mantra/UIDAI standards.
    if (finalBiometricJson.errCode !== "0") {
      return res.status(422).json({
        success: false,
        message: `Capture Failed: ${finalBiometricJson.errInfo || "No error info provided"}`,
        errorCode: finalBiometricJson.errCode,
      });
    }

    console.log(finalBiometricJson, "finalBiometricJson");

    const finalPayload = {
      ...finalBiometricJson, // existing biometric data
      encryptedAadhaar: encryptedAadhaar, // add encrypted aadhaar
    };

    console.log(finalPayload, "finalPayload");

    const response = await dailyLogin({
      userId,
      requestId: idempotency,
      latitude,
      longitude,
      captureType,
      biometricData: finalPayload,
    });

    console.log(response, "response");

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
};

const balanceEnquiry = async (req, res, next) => {
  try {
    let {
      aadhaar,
      mobile,
      bankId,
      latitude,
      longitude,
      captureType = "FINGER",
      biometricData,
    } = req.body;

    aadhaar = aadhaar?.trim();
    mobile = mobile?.trim();
    bankId = bankId?.trim();
    latitude = Number(latitude);
    longitude = Number(longitude);
    captureType = captureType?.trim().toUpperCase();

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = [
      "aadhaar",
      "mobile",
      "bankId",
      "latitude",
      "longitude",
      "captureType",
      "biometricData",
    ];

    const missingFields = [];

    requiredFields.forEach((field) => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${missingFields.join(", ")} is required`,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      return res.status(400).json({
        success: false,
        message: "Bank ID invalid",
      });
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: "Latitude and Longitude must be valid numbers",
      });
    }

    // Range validation
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude (must be between -90 and 90)",
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid longitude (must be between -180 and 180)",
      });
    }

    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(aadhaar)) {
      return res.status(400).json({
        success: false,
        message: "Aadhaar must be 12 digits valid aadhaar",
      });
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid mobile number" });
    }

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    if (!["FINGER", "FACE", "IRIS"].includes(captureType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Capture type",
      });
    }

    if (!biometricData) {
      return res
        .status(400)
        .json({ success: false, message: "Biometric data is required" });
    }

    const encryptedAadhaar = encryptAadhaar(aadhaar);

    const isValidBank = await InstantBank.findById(bankId).select("iin").lean();

    if (!isValidBank) {
      return res.status(404).json({
        success: false,
        message: "Bank not found",
      });
    }

    console.log("Bank iin", isValidBank?.iin);
    console.log("Bank iin type", typeof isValidBank?.iin);

    let finalBiometricJson;

    if (
      typeof biometricData === "string" &&
      biometricData.trim().startsWith("<?xml")
    ) {
      // Input is XML string - Transform it
      try {
        finalBiometricJson = await parseMantraXml(biometricData);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Biometric XML is malformed.",
          error: error.message,
        });
      }
    } else if (typeof biometricData === "object" && biometricData !== null) {
      // Input is already JSON - Use as is (assuming it matches your schema)
      finalBiometricJson = biometricData;
    } else {
      return res.status(400).json({
        success: false,
        message:
          "Invalid biometricData format. Expected XML string or JSON object.",
      });
    }

    //  Device-Level Error Validation
    // errCode "0" means success in Mantra/UIDAI standards.
    if (finalBiometricJson.errCode !== "0") {
      return res.status(422).json({
        success: false,
        message: `Capture Failed: ${finalBiometricJson.errInfo || "No error info provided"}`,
        errorCode: finalBiometricJson.errCode,
      });
    }

    console.log(finalBiometricJson, "finalBiometricJson");

    const { error } = validateBiometricSchema(finalBiometricJson);

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Biometric data integrity check failed",
        details: error.details[0].message, // Tells exactly which field is wrong
      });
    }

    if (parseInt(finalBiometricJson.qScore) < 40) {
      return res.status(422).json({
        success: false,
        message: "Fingerprint quality too low. Please capture again.",
      });
    }

    const finalPayload = {
      ...finalBiometricJson, // existing biometric data
      encryptedAadhaar: encryptedAadhaar, // add encrypted aadhaar
    };

    console.log(finalPayload, "finalPayload");

    const response = await doBalanceEnquiry({
      userId,
      requestId: idempotency,
      mobile,
      iin: isValidBank?.iin?.toString(),
      latitude,
      longitude,
      captureType,
      biometricData: finalPayload,
    });

    console.log(response, "response");

    return res.status(201).json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
};

const miniStatement = async (req, res, next) => {
  try {
    let {
      aadhaar,
      mobile,
      bankId,
      latitude,
      longitude,
      captureType = "FINGER",
      biometricData,
    } = req.body;

    aadhaar = aadhaar?.trim();
    mobile = mobile?.trim();
    bankId = bankId?.trim();
    latitude = Number(latitude);
    longitude = Number(longitude);
    captureType = captureType?.trim().toUpperCase();

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = [
      "aadhaar",
      "mobile",
      "bankId",
      "latitude",
      "longitude",
      "captureType",
      "biometricData",
    ];

    const missingFields = [];

    requiredFields.forEach((field) => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${missingFields.join(", ")} is required`,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      return res.status(400).json({
        success: false,
        message: "Bank ID invalid",
      });
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: "Latitude and Longitude must be valid numbers",
      });
    }

    // Range validation
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude (must be between -90 and 90)",
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid longitude (must be between -180 and 180)",
      });
    }

    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(aadhaar)) {
      return res.status(400).json({
        success: false,
        message: "Aadhaar must be 12 digits valid aadhaar",
      });
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid mobile number" });
    }

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    if (!["FINGER", "FACE", "IRIS"].includes(captureType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Capture type",
      });
    }

    if (!biometricData) {
      return res
        .status(400)
        .json({ success: false, message: "Biometric data is required" });
    }

    const encryptedAadhaar = encryptAadhaar(aadhaar);

    const isValidBank = await InstantBank.findById(bankId).select("iin").lean();

    if (!isValidBank) {
      return res.status(404).json({
        success: false,
        message: "Bank not found",
      });
    }

    console.log("Bank iin", isValidBank?.iin);
    console.log("Bank iin type", typeof isValidBank?.iin);

    let finalBiometricJson;

    if (
      typeof biometricData === "string" &&
      biometricData.trim().startsWith("<?xml")
    ) {
      // Input is XML string - Transform it
      try {
        finalBiometricJson = await parseMantraXml(biometricData);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Biometric XML is malformed.",
          error: error.message,
        });
      }
    } else if (typeof biometricData === "object" && biometricData !== null) {
      // Input is already JSON - Use as is (assuming it matches your schema)
      finalBiometricJson = biometricData;
    } else {
      return res.status(400).json({
        success: false,
        message:
          "Invalid biometricData format. Expected XML string or JSON object.",
      });
    }

    //  Device-Level Error Validation
    // errCode "0" means success in Mantra/UIDAI standards.
    if (finalBiometricJson.errCode !== "0") {
      return res.status(422).json({
        success: false,
        message: `Capture Failed: ${finalBiometricJson.errInfo || "No error info provided"}`,
        errorCode: finalBiometricJson.errCode,
      });
    }

    console.log(finalBiometricJson, "finalBiometricJson");

    const { error } = validateBiometricSchema(finalBiometricJson);

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Biometric data integrity check failed",
        details: error.details[0].message, // Tells exactly which field is wrong
      });
    }

    if (parseInt(finalBiometricJson.qScore) < 40) {
      return res.status(422).json({
        success: false,
        message: "Fingerprint quality too low. Please capture again.",
      });
    }

    const finalPayload = {
      ...finalBiometricJson, // existing biometric data
      encryptedAadhaar: encryptedAadhaar, // add encrypted aadhaar
    };

    console.log(finalPayload, "finalPayload");

    const response = await doMiniStatement({
      userId,
      requestId: idempotency,
      mobile,
      iin: isValidBank?.iin?.toString(),
      latitude,
      longitude,
      captureType,
      biometricData: finalPayload,
    });

    console.log(response, "response");

    return res.status(201).json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
};

const cashWithdraw = async (req, res, next) => {
  try {
    let {
      aadhaar,
      mobile,
      bankId,
      amount,
      latitude,
      longitude,
      captureType = "FINGER",
      biometricData,
    } = req.body;

    aadhaar = aadhaar?.trim();
    mobile = mobile?.trim();
    bankId = bankId?.trim();
    amount = Number(amount);
    latitude = Number(latitude);
    longitude = Number(longitude);
    captureType = captureType?.trim().toUpperCase();

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = [
      "aadhaar",
      "mobile",
      "bankId",
      "amount",
      "latitude",
      "longitude",
      "captureType",
      "biometricData",
    ];

    const missingFields = [];

    requiredFields.forEach((field) => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${missingFields.join(", ")} is required`,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      return res.status(400).json({
        success: false,
        message: "Bank ID invalid",
      });
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: "Latitude and Longitude must be valid numbers",
      });
    }

    // Range validation
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude (must be between -90 and 90)",
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid longitude (must be between -180 and 180)",
      });
    }

    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(aadhaar)) {
      return res.status(400).json({
        success: false,
        message: "Aadhaar must be 12 digits valid aadhaar",
      });
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid mobile number" });
    }

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    if (!["FINGER", "FACE", "IRIS"].includes(captureType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Capture type",
      });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    if (amount % 50 !== 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be in multiple of 50",
      });
    }

    if (!biometricData) {
      return res
        .status(400)
        .json({ success: false, message: "Biometric data is required" });
    }

    const encryptedAadhaar = encryptAadhaar(aadhaar);
    const amountInPaise = rupeeToPaise(amount);

    if (amountInPaise < 10000) {
      return res.status(400).json({
        success: false,
        message: "Minimum Withdrawal amount is 100 rupees ",
      });
    }

    const isValidBank = await InstantBank.findById(bankId).select("iin").lean();

    if (!isValidBank) {
      return res.status(404).json({
        success: false,
        message: "Bank not found",
      });
    }

    console.log("Bank iin", isValidBank?.iin);
    console.log("Bank iin type", typeof isValidBank?.iin);

    let finalBiometricJson;

    if (
      typeof biometricData === "string" &&
      biometricData.trim().startsWith("<?xml")
    ) {
      // Input is XML string - Transform it
      try {
        finalBiometricJson = await parseMantraXml(biometricData);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Biometric XML is malformed.",
          error: error.message,
        });
      }
    } else if (typeof biometricData === "object" && biometricData !== null) {
      // Input is already JSON - Use as is (assuming it matches your schema)
      finalBiometricJson = biometricData;
    } else {
      return res.status(400).json({
        success: false,
        message:
          "Invalid biometricData format. Expected XML string or JSON object.",
      });
    }

    //  Device-Level Error Validation
    // errCode "0" means success in Mantra/UIDAI standards.
    if (finalBiometricJson.errCode !== "0") {
      return res.status(422).json({
        success: false,
        message: `Capture Failed: ${finalBiometricJson.errInfo || "No error info provided"}`,
        errorCode: finalBiometricJson.errCode,
      });
    }

    console.log(finalBiometricJson, "finalBiometricJson");

    const { error } = validateBiometricSchema(finalBiometricJson);

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Biometric data integrity check failed",
        details: error.details[0].message, // Tells exactly which field is wrong
      });
    }

    if (parseInt(finalBiometricJson.qScore) < 40) {
      return res.status(422).json({
        success: false,
        message: "Fingerprint quality too low. Please capture again.",
      });
    }

    const finalPayload = {
      ...finalBiometricJson, // existing biometric data
      encryptedAadhaar: encryptedAadhaar, // add encrypted aadhaar
    };

    console.log(finalPayload, "finalPayload");

    const response = await doCashWithdraw({
      userId,
      requestId: idempotency,
      mobile,
      iin: isValidBank?.iin?.toString(),
      amount: amountInPaise, //paise
      latitude,
      longitude,
      captureType,
      biometricData: finalPayload,
    });

    console.log(response, "response");

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerOutlet,
  getBiometricKycStatus,
  completetBiometricKyc,
  dailyAepsLogin,
  balanceEnquiry,
  miniStatement,
  cashWithdraw,
};
