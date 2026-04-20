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
  kycOtp,
  verifyOtp,
  ekycBiometric,
  initiateAepsTransaction,
  dailyBiometricLogin,
} = require("../../services/ekoAepsService");
const { rupeeToPaise } = require("../../utils/money");

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

const getServiceType = (serviceName) => {
  const map = {
    withdraw: 2,
    inquiry: 3,
    statement: 4,
  };

  return map[serviceName?.toLowerCase()] || null;
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

    if ([1290, 1307].includes(response?.data?.response_type_id)) {
      const data = response?.data?.data;

      await EkoOnboardAepsUser.findOneAndUpdate(
        { userId },
        {
          $set: {
            userCode: data?.user_code,
            initiatorId: data?.initiator_id,
            firstName,
            lastName,
            email,
            mobile,
            panNumber,
            dateOfBirth,
            address,
          },
        },
        { upsert: true, new: true },
      );

      return res.status(200).json({
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

    console.log(req.body);

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
        EkoBank.findById(bank).select("bankCode bankName").lean(),
        EkoState.findById(officeAddress?.state).select("value label").lean(),
        EkoState.findById(address?.state).select("value label").lean(),
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
      state: stateData.label,
    };

    officeAddress = {
      ...officeAddress,
      state_id: officeStateData.value,
      state: officeStateData.label,
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

    if (response && response?.http_code === 200) {
      const data = response?.data;
      const isServiceActivated =
        response?.data?.service_status_desc === "Activated";

      await EkoOnboardAepsUser.findOneAndUpdate(
        { userId: userId },
        {
          $set: {
            bank: bankData.bankCode,
            officeAddress: officeAddress,
            ifsc,
            accountNumber: accountNumber,
            aadhaar,
            latitude,
            longitude,
            deviceNumber,
            modelName,
            isActivated: isServiceActivated ? true : false,
          },
        },
      );
      return res.status(200).json({
        success: true,
        data: {
          status: response?.data?.service_status_desc,
          message: response?.message,
        },
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

const generateKycOtp = async (req, res, next) => {
  try {
    let { aadhaar, latitude, longitude } = req.body;

    aadhaar = aadhaar?.trim();
    latitude = Number(latitude);
    longitude = Number(longitude);

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = ["aadhaar", "latitude", "longitude"];

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

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    const response = await kycOtp({
      userId,
      requestId: idempotency,
      aadhaar,
      latitude,
      longitude,
    });

    console.log(response, "response");

    if (response && response?.status === true) {
      const data = response?.data?.data;

      await EkoOnboardAepsUser.findOneAndUpdate(
        { userId: userId },
        {
          $set: {
            temp_reference_tid: data?.reference_tid,
            temp_otp_ref_id: data?.otp_ref_id,
          },
        },
      );

      return res.status(200).json({
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

const verifyKycOtp = async (req, res, next) => {
  try {
    let { otp, latitude, longitude } = req.body;

    otp = otp?.trim();
    latitude = Number(latitude);
    longitude = Number(longitude);

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = ["otp", "latitude", "longitude"];

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

    const response = await verifyOtp({
      userId,
      requestId: idempotency,
      otp,
      latitude,
      longitude,
    });

    console.log(response, "response");

    if (response && response?.status === true) {
      const data = response?.data?.data;

      await EkoOnboardAepsUser.findOneAndUpdate(
        { userId: userId },
        {
          $set: {
            temp_reference_tid: data?.reference_tid,
            temp_otp_ref_id: data?.otp_ref_id,
          },
        },
      );

      return res.status(200).json({
        success: true,
        data: {
          message: `OTP ${response?.data?.message}`,
        },
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

const doEkycBiometric = async (req, res, next) => {
  try {
    let { latitude, longitude, pidData } = req.body;

    latitude = Number(latitude);
    longitude = Number(longitude);

    const requiredFields = ["latitude", "longitude", , "pidData"];

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

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    const response = await ekycBiometric({
      userId,
      requestId: idempotency,
      latitude: latitude,
      longitude: longitude,
      pidData: pidData,
    });

    console.log(response, "response");

    if (
      response &&
      response?.status === true &&
      response?.data?.response_status_id === 0 &&
      response?.data?.status === 0
    ) {
      const data = response?.data;

      await EkoOnboardAepsUser.findOneAndUpdate(
        { userId: userId },
        {
          $set: { isActivated: true },
        },
      );

      return res.status(201).json({
        success: true,
        data: {
          message: data?.message,
        },
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

const dailyAepsLogin = async (req, res, next) => {
  try {
    let { latitude, longitude, pidData } = req.body;

    latitude = Number(latitude);
    longitude = Number(longitude);

    const requiredFields = ["latitude", "longitude", "pidData"];

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

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    const response = await dailyBiometricLogin({
      userId,
      requestId: idempotency,
      latitude: latitude,
      longitude: longitude,
      pidData: pidData,
    });

    console.log(response, "response");

    if (response && response?.status === true) {
      const data = response?.data?.data;

      await EkoOnboardAepsUser.findOneAndUpdate(
        { userId: userId },
        {
          $set: { isActivated: true },
        },
      );

      return res.status(201).json({
        success: true,
        data: {
          message: response?.message,
        },
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

const doAepsTransaction = async (req, res, next) => {
  try {
    let {
      sourceIp,
      serviceType,
      bankId,
      amount = 0,
      latitude,
      longitude,
      pidData,
    } = req.body;

    console.log(req.body, "body");

    latitude = Number(latitude);
    longitude = Number(longitude);
    sourceIp = sourceIp?.trim();
    bankId = bankId?.trim();
    serviceType = serviceType?.trim().toLowerCase();
    amount = Number(amount);

    const requiredFields = [
      "sourceIp",
      "serviceType",
      "bankId",
      "latitude",
      "longitude",
      "pidData",
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
        message: "Invalid Bank ID",
      });
    }

    const isBankExist = await EkoBank.findOne({ _id: bankId })
      .select("bankCode")
      .lean();

    if (!isBankExist) {
      return res.status(404).json({
        success: false,
        message: " Bank not found",
      });
    }

    if (!["withdraw", "inquiry", "statement"].includes(serviceType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Service Name Selected",
      });
    }

    // Check invalid number
    if (isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    const serviceCode = getServiceType(serviceType);
    const amountInPaise = rupeeToPaise(amount);

    //rupee comparison 100 rupee
    if (serviceType === "withdraw" && amount < 100) {
      return res.status(400).json({
        success: false,
        message: "Minimum withdrawal amount is 100",
      });
    }

    //rupee comparison 0 rupee
    if (["inquiry", "statement"].includes(serviceType) && amount !== 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be 0 for inquiry and statement",
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

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    const response = await initiateAepsTransaction({
      userId,
      requestId: idempotency,
      latitude: latitude,
      longitude: longitude,
      pidData: pidData,
      serviceType: serviceCode,
      sourceIp: sourceIp,
      amount: amountInPaise,
      serviceTypeName: serviceType?.toUpperCase(), //just for logs type
      bankCode: isBankExist?.bankCode,
    });

    console.log(response, "response");

    if (response && response?.status === true) {
      const data = response?.data?.data;

      await EkoOnboardAepsUser.findOneAndUpdate(
        { userId: userId },
        {
          $set: { isActivated: true },
        },
      );

      return res.status(201).json({
        success: true,
        data: {
          message: response?.message,
        },
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  onboardAepsUser,
  activateUser,
  generateKycOtp,
  verifyKycOtp,
  doEkycBiometric,
  dailyAepsLogin,
  doAepsTransaction,
};
