const mongoose = require("mongoose");
const { Types } = require("mongoose");
const EkoOnboardAepsUser = require("../../models/ekoAepsOnboardUserModel");
const EkoState = require("../../models/ekoStateModel");
const EkoBank = require("../../models/ekoBankModel");
const {
  instantAepsOutletRegister,
} = require("../../services/instantAepsService");
const { parseMantraXml } = require("../../helpers/formatMantraBiometricData");
const { encryptAadhaar } = require("../../helpers/encryptDecryptAadhar");
const {
  validateBiometricSchema,
} = require("../../validators/biometricDataValidator");
const {
  onboardEkoAepsUser,
  activateService,
} = require("../../services/ekoAepsService");

const validateAddress = (address, type = "address") => {
  const errors = {};

  if (!address) {
    return {
      isValid: false,
      errors: { [`${type}`]: `${type} is required` },
    };
  }

  let { line, city, state, pincode, district, area } = address;

  line = line?.trim();
  city = city?.trim();
  state = state?.trim();
  pincode = pincode?.trim();
  district = district?.trim();
  area = area?.trim();

  if (!line) {
    errors[`${type}.line`] = "Address line is required";
  }

  if (!city) {
    errors[`${type}.city`] = "City is required";
  }

  if (!state) {
    errors[`${type}.state`] = "State is required";
  }

  if (!district) {
    errors[`${type}.district`] = "District is required";
  }

  if (!area) {
    errors[`${type}.area`] = "Area is required";
  }

  if (!pincode) {
    errors[`${type}.pincode`] = "Pincode is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

const onboardAepsUser = async (req, res, next) => {
  try {
    let {
      mobile,
      panNumber,
      firstName,
      lastName,
      email,
      dateOfBirth,
      shopName,
      address,
    } = req.body;

    mobile = mobile?.trim();
    panNumber = panNumber?.trim();
    firstName = firstName?.trim();
    lastName = lastName?.trim();
    email = email?.trim().toLowerCase();
    dateOfBirth = dateOfBirth?.trim();
    shopName = shopName?.trim();

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = [
      "mobile",
      "panNumber",
      "firstName",
      "lastName",
      "email",
      "dateOfBirth",
      "shopName",
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

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(panNumber)) {
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

    const { isValid, errors } = validateAddress(address);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        errors,
      });
    }

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    const isUserOnboarded = await EkoOnboardAepsUser.findOne({
      userId: userId,
    });

    if (isUserOnboarded) {
      return res.status(200).json({
        success: true,
        message: "User already onboarded",
      });
    }

    const response = await onboardEkoAepsUser({
      userId,
      requestId: idempotency,
      mobile,
      panNumber,
      firstName,
      lastName,
      email,
      dateOfBirth,
      shopName,
      address,
    });

    console.log(response, "response");

    if (response && response?.data?.response_type_id === 1290) {
      const data = response?.data?.data;
      const ekoUserOnboard = new EkoOnboardAepsUser({
        userId: userId,
        userCode: data?.user_code,
        initiatorId: data?.initiator_id,
        firstName: firstName,
        lastName: lastName,
        email: email,
        mobile: mobile,
        panNumber: panNumber,
        dateOfBirth: dateOfBirth,
        address: address,
      });

      await ekoUserOnboard.save();
      return res.status(201).json({
        success: true,
        data: {
          message: response?.data?.message,
        },
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

const activateUser = async (req, res, next) => {
  try {
    let {
      address,
      officeAddress,
      bank,
      ifsc,
      accountNumber,
      aadhaar,
      latitude,
      longitude,
      deviceNumber,
      modelName,
    } = req.body;

    ifsc = ifsc?.trim()?.toUpperCase();
    bank = bank?.trim();
    accountNumber = accountNumber?.trim();
    aadhaar = aadhaar?.trim();
    latitude = Number(latitude);
    longitude = Number(longitude);
    deviceNumber = deviceNumber?.trim();
    modelName = modelName?.trim();

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const aadhaarFrontFile = req.files?.aadhaarFront?.[0];
    const aadhaarBackFile = req.files?.aadhaarBack?.[0];
    const panFile = req.files?.panCard?.[0];

    const missingFiles = [];

    if (!aadhaarFrontFile) missingFiles.push("aadhaarFront");
    if (!aadhaarBackFile) missingFiles.push("aadhaarBack");
    if (!panFile) missingFiles.push("panCard");

    if (missingFiles.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required files",
        missing: missingFiles,
      });
    }

    const requiredFields = [
      "address",
      "officeAddress",
      "bank",
      "ifsc",
      "accountNumber",
      "aadhaar",
      "latitude",
      "longitude",
      "deviceNumber",
      "modelName",
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

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

    if (!ifscRegex.test(ifsc.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid IFSC code",
      });
    }

    const accountNumberRegex = /^[0-9]{9,18}$/;

    if (!accountNumberRegex.test(accountNumber)) {
      return res.status(400).json({
        success: false,
        message: "Account number must be 9 to 18 digits",
      });
    }

    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(aadhaar)) {
      return res
        .status(400)
        .json({ success: false, message: "Aadhaar must be 12 digits" });
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

    const { isValid, errors } = validateAddress(address, "address");
    const { isValid: isValidOffice, errors: officeErrors } = validateAddress(
      officeAddress,
      "officeAddress",
    );

    if (!isValid || !isValidOffice) {
      return res.status(400).json({
        success: false,
        errors: {
          ...errors,
          ...officeErrors,
        },
      });
    }

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    if (!address?.state) {
      return res.status(400).json({
        success: false,
        message: "State Id is required",
      });
    }

    if (!officeAddress?.state) {
      return res.status(400).json({
        success: false,
        message: "Office State Id is required",
      });
    }

    const validateObjectId = (id, message) => {
      if (!Types.ObjectId.isValid(id)) {
        throw new Error(message);
      }
    };

    let bankData, officeStateData, stateData;

    try {
      validateObjectId(officeAddress?.state, "Invalid Office State Id");
      validateObjectId(address?.state, "Invalid State Id");
      validateObjectId(bank, "Invalid Bank Id");

      [bankData, officeStateData, stateData] = await Promise.all([
        EkoBank.findById(bank).select("bankCode").lean(),
        EkoState.findById(officeAddress?.state).select("value").lean(),
        EkoState.findById(address?.state).select("value").lean(),
      ]);

      if (!bankData) {
        return res.status(400).json({
          success: false,
          message: "Bank not valid",
        });
      }

      if (!officeStateData) {
        return res.status(400).json({
          success: false,
          message: "Office State Not Valid",
        });
      }

      if (!stateData) {
        return res.status(400).json({
          success: false,
          message: "State Not Valid",
        });
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    console.log(stateData.value, "state id value");
    console.log(officeStateData.value, "state id value");

    address = {
      ...address,
      state_id: stateData.value,
    };

    officeAddress = {
      ...officeAddress,
      state_id: officeStateData.value,
    };

    console.log(address, "address after spread and update state");
    console.log(officeAddress, "office address after spread and update state");

    const response = await activateService({
      userId,
      requestId: idempotency,
      address,
      officeAddress,
      bank: bankData.bankCode,
      ifsc,
      accountNumber,
      aadhaar,
      latitude,
      longitude,
      deviceNumber,
      modelName,
      aadhaarFrontFile,
      aadhaarBackFile,
      panFile,
    });

    console.log(response, "response");

    if (response && response?.data?.response_type_id === 1290) {
      const data = response?.data?.data;
      const ekoUserOnboard = new EkoOnboardAepsUser({
        userId: userId,
        userCode: data?.user_code,
        initiatorId: data?.initiator_id,
        firstName: firstName,
        lastName: lastName,
        email: email,
        mobile: mobile,
        panNumber: panNumber,
        dateOfBirth: dateOfBirth,
        address: address,
      });

      await ekoUserOnboard.save();
      return res.status(201).json({
        success: true,
        data: {
          message: response?.data?.message,
        },
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { onboardAepsUser, activateUser };
