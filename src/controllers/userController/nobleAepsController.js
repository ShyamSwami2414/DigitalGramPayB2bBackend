const {
  getChannelForNobleAeps,
} = require("../../middleware/requestSourceTrackerMiddleware");
const NobleAepsState = require("../../models/nobleAepsStateModel");
const mongoose = require("mongoose");
const NobleAepsAgent = require("../../models/nobleAepsAgentModel");
const NobleAepsBank = require("../../models/nobleAepsBankModel");
const { generateAgentCode } = require("../../utils/generateNobleAepsAgentCode");
const {
  nobleAepsOnboardAgent,
  loadAepsAgent,
  biometricKyc,
  daily2faLogin,
  initiateAepsTransaction,
  retrieveUniqueAgentId,
} = require("../../services/nobleAepsService");
const getMobileDeviceId = require("../../utils/generateNobleMobileDeviceId");
const { rupeeToPaise } = require("../../utils/money");

exports.getAepsStateList = async (req, res, next) => {
  try {
    const states = await NobleAepsState.find().select("stateName").lean();

    return res
      .status(200)
      .json({ success: true, message: "State List", data: states });
  } catch (error) {
    next(error);
  }
};

exports.getAepsBankList = async (req, res, next) => {
  try {
    const banks = await NobleAepsBank.find().select("bankName").lean();

    return res
      .status(200)
      .json({ success: true, message: "Aeps Bank List", data: banks });
  } catch (error) {
    next(error);
  }
};

exports.onboardNewAgent = async (req, res, next) => {
  try {
    let {
      firstName,
      middleName,
      lastName,
      mobileNumber,
      email,
      aadhaar,
      panNumber,
      dob,
      address,
      state,
      city,
      pincode,
      bankName,
      bankAccountNumber,
      bankIfsc,
      shopName,
      shopAddress,
      shopState,
      shopCity,
      shopPincode,
      shopLongitude,
      shopLatitude,
      source,
    } = req.body;

    firstName = firstName?.trim();
    middleName = middleName?.trim();
    lastName = lastName?.trim();
    mobileNumber = mobileNumber?.trim();
    email = email?.trim()?.toLowerCase();
    aadhaar = aadhaar?.trim();
    panNumber = panNumber?.trim();
    dob = dob?.trim();

    address = address?.trim();
    state = state?.trim();
    city: city?.trim();
    pincode = pincode?.trim();

    bankName = bankName?.trim();
    bankAccountNumber = bankAccountNumber?.trim();
    bankIfsc = bankIfsc?.trim();

    shopName = shopName?.trim();
    shopAddress = shopAddress?.trim();
    shopState = shopState?.trim();
    shopCity = shopCity?.trim();
    shopPincode = shopPincode?.trim();
    shopLongitude = Number(shopLongitude);
    shopLatitude = Number(shopLatitude);
    source = source?.trim();

    console.log(req.body, "BODY");

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = [
      "firstName",
      "lastName",
      "mobileNumber",
      "email",
      "aadhaar",
      "panNumber",
      "dob",
      "address",
      "state",
      "city",
      "pincode",
      "bankName",
      "bankAccountNumber",
      "bankIfsc",
      "shopName",
      "shopAddress",
      "shopState",
      "shopCity",
      "shopPincode",
      "shopLongitude",
      "shopLatitude",
      "source",
    ];

    // const channel = getChannelForNobleAeps(req);
    const agentCode = await generateAgentCode();

    const ipAddress = (
      req.headers["x-forwarded-for"] || req.socket.remoteAddress
    )
      .split(",")[0]
      .replace("::ffff:", "")
      .trim();

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
    if (!mobileRegex.test(mobileNumber)) {
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
    if (!panRegex.test(panNumber)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid PAN format" });
    }

    const parts = dob.split("/");

    if (parts.length !== 3) {
      return res.status(400).json({
        success: false,
        message: "DOB must be in DD/MM/YYYY format",
      });
    }

    const [day, month, year] = parts;

    const dateOfBirth = new Date(year, month - 1, day);

    // Validate invalid date
    if (isNaN(dateOfBirth.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date of birth",
      });
    }

    // Accurate age calculation
    const today = new Date();

    let age = today.getFullYear() - dateOfBirth.getFullYear();

    const monthDifference = today.getMonth() - dateOfBirth.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < dateOfBirth.getDate())
    ) {
      age--;
    }

    // Validate minimum age
    if (age < 18) {
      return res.status(400).json({
        success: false,
        message: "User must be at least 18 years old",
      });
    }

    console.log("Valid age:", age);

    // Check NaN
    if (isNaN(shopLatitude) || isNaN(shopLongitude)) {
      return res.status(400).json({
        success: false,
        message: "Latitude and Longitude must be valid numbers",
      });
    }

    // Range validation
    if (shopLatitude < -90 || shopLatitude > 90) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude (must be between -90 and 90)",
      });
    }

    if (shopLongitude < -180 || shopLongitude > 180) {
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

    const isAgentExist = await NobleAepsAgent.findOne({
      userId: userId,
    });

    if (isAgentExist) {
      return res.status(200).json({
        success: true,
        message:
          "User already onboarded for AEPS, please proceed with further steps",
      });
    }

    const response = await nobleAepsOnboardAgent({
      userId: userId,
      requestId: idempotency,
      channel: source,
      ipAddress: ipAddress,

      firstName: firstName,
      middleName: middleName ? middleName : "",
      lastName: lastName,
      email: email,
      mobileNumber: mobileNumber,
      agentCode: agentCode,

      aadhaar: aadhaar,
      panNumber: panNumber,
      dob: dob,

      address,
      state,
      city,
      pincode,
      bankName,
      bankAccountNumber,
      bankIfsc,
      shopName,
      shopAddress,
      shopState,
      shopCity,
      shopPincode,
      shopLongitude,
      shopLatitude,
    });

    console.log(response, "response");

    if (
      response &&
      response?.data?.status === 1 &&
      response?.data?.statusCode === "AG0001"
    ) {
      const data = response?.data?.responseData?.[0];

      const agentAlreadyExist = await NobleAepsAgent.findOne({
        uniqueAgentId: data?.uniqueAgentId,
      });

      if (agentAlreadyExist) {
        return res.status(400).json({
          success: false,
          message: "User already onboarded for AEPS with another email",
        });
      }

      const [day, month, year] = dob.split("/");

      const formattedDob = new Date(`${year}-${month}-${day}`);

      const agentRegister = new NobleAepsAgent({
        userId: userId,
        uniqueAgentId: data?.uniqueAgentId,
        agentCode: agentCode,
        channel: source,
        ipAddress: ipAddress,

        firstName: firstName,
        middleName: middleName ? middleName : "",
        lastName: lastName,
        email: email,
        mobileNumber: mobileNumber,

        aadhaar: aadhaar,
        panNumber: panNumber,
        dob: formattedDob,

        address,
        state,
        city,
        pincode,
        bankName,
        bankAccountNumber,
        bankIfsc,
        shopName,
        shopAddress,
        shopState,
        shopCity,
        shopPincode,
        shopLongitude,
        shopLatitude,
        isKycDone: true,
      });

      await agentRegister.save();
      return res.status(201).json({
        success: true,
        data: {
          message: response?.data?.description || response?.data?.message,
        },
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

exports.checkAgentLoadStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    const response = await loadAepsAgent({
      userId: userId,
      requestId: idempotency,
    });

    console.log(response, "response");

    if (response && response?.data?.statusCode === "AG0001") {
      const data = response?.data?.responseData?.[0];

      console.log(data, "data");
      return res.status(200).json({
        success: true,
        data: {
          message: response?.data?.description || response?.data?.message,
          isKycRequired: data.KycRequired === "YES" ? true : false,
          is2faRequired: data?.Daily2fa_AEPS_Required === "YES" ? true : false,
        },
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

exports.completetBiometricKyc = async (req, res, next) => {
  try {
    let {
      bussinessNature = "Mobility",
      annualIncome,
      latitude,
      longitude,
      bioType = "FINGER",
      pidData,
      mobileDeviceId,
      source,
    } = req.body;

    latitude = Number(latitude);
    longitude = Number(longitude);
    bioType = bioType?.trim().toUpperCase();
    source = source?.trim().toUpperCase();
    annualIncome = annualIncome?.trim();
    bussinessNature = bussinessNature?.trim();

    console.log(req.body, "BODY");

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = [
      "latitude",
      "longitude",
      "bioType",
      "pidData",
      "annualIncome",
      "bussinessNature",
      "source",
    ];

    if (source === "APP" && !mobileDeviceId) {
      return res.status(400).json({
        success: false,
        message: `mobileDeviceId is required`,
      });
    }

    const userAgent = req.headers["user-agent"] || "";

    console.log(userAgent, "userAgent");

    const deviceId = getMobileDeviceId(userAgent);

    if (source === "WEB") {
      mobileDeviceId = deviceId;
    }

    console.log(source, "source");
    console.log(mobileDeviceId, "mobileDeviceId");

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

    // const channel = getChannelForNobleAeps(req);

    const ipAddress = (
      req.headers["x-forwarded-for"] || req.socket.remoteAddress
    )
      .split(",")[0]
      .replace("::ffff:", "")
      .trim();

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

    if (!["FINGER", "FACE", "IRIS"].includes(bioType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Bio type",
      });
    }

    if (!pidData) {
      return res
        .status(400)
        .json({ success: false, message: "PID data is required" });
    }

    const response = await biometricKyc({
      userId,
      requestId: idempotency,
      latitude,
      longitude,
      bioType,
      pidData,
      bussinessNature,
      annualIncome,
      channel: source,
      ipAddress: ipAddress,
      userAgent: userAgent,
      mobileDeviceId: mobileDeviceId ? mobileDeviceId : undefined,
    });

    console.log(response, "response");

    if (
      response &&
      response?.data?.statusCode === "AG0001" &&
      response?.data?.responseData?.[0]?.tranStatus === "Success"
    ) {
      const data = response?.data?.responseData?.[0];

      console.log(data, "data");

      const update = await NobleAepsAgent.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId) },
        {
          $set: {
            isKycDone: true,
            isAepsEnabled: true,
          },
        },
        { new: true },
      );

      if (!update) {
        throw Error("Merchant not exist");
      }

      return res.status(200).json({
        success: true,
        data: {
          message: response?.description || response?.message,
          status: data?.tranStatus,
          transactionId: data?.transactionId,
        },
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

//this one check onboard status 2th number not for load
exports.checkAgentOnboardStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    const response = await retrieveUniqueAgentId({
      userId: userId,
      requestId: idempotency,
    });

    console.log(response, "response");

    if (response && response?.data?.statusCode === "AG0001") {
      const data = response?.data?.responseData?.[0];

      console.log(data, "data");
      return res.status(200).json({
        success: true,
        data: {
          status: response?.data?.message,
          message: response?.data?.description || response?.data?.message,
        },
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

exports.dailyLogin = async (req, res, next) => {
  try {
    let {
      source,
      mobileDeviceId,
      latitude,
      longitude,
      bioType = "FINGER",
      pidData,
    } = req.body;

    source = source?.trim().toUpperCase();
    mobileDeviceId = mobileDeviceId?.trim();
    latitude = Number(latitude);
    longitude = Number(longitude);
    bioType = bioType?.trim().toUpperCase();

    console.log(req.body, "BODY");

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = [
      "latitude",
      "longitude",
      "bioType",
      "pidData",
      "source",
    ];

    if (source === "APP" && !mobileDeviceId) {
      return res.status(400).json({
        success: false,
        message: `mobileDeviceId is required`,
      });
    }

    const userAgent = req.headers["user-agent"] || "";

    console.log(userAgent, "userAgent");

    const deviceId = getMobileDeviceId(userAgent);

    if (source === "WEB") {
      mobileDeviceId = deviceId;
    }

    console.log(source, "source");
    console.log(mobileDeviceId, "mobileDeviceId");

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

    // const channel = getChannelForNobleAeps(req);

    const ipAddress = (
      req.headers["x-forwarded-for"] || req.socket.remoteAddress
    )
      .split(",")[0]
      .replace("::ffff:", "")
      .trim();

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

    if (!["FINGER", "FACE", "IRIS"].includes(bioType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Bio type",
      });
    }

    if (!pidData) {
      return res
        .status(400)
        .json({ success: false, message: "PID data is required" });
    }

    const response = await daily2faLogin({
      userId,
      requestId: idempotency,
      latitude,
      longitude,
      bioType,
      pidData,
      channel: source,
      ipAddress: ipAddress,
      userAgent: userAgent,
      mobileDeviceId: mobileDeviceId ? mobileDeviceId : undefined,
    });

    console.log(response, "response");

    if (
      response &&
      response?.data?.statusCode === "AG0001" &&
      response?.data?.responseData?.[0]?.tranStatus === "Success"
    ) {
      const data = response?.data?.responseData?.[0];

      console.log(data, "data");

      const update = await NobleAepsAgent.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId) },
        {
          $set: {
            isLoginRequired: false,
            lastLoginAt: Date.now(),
          },
        },
        { new: true },
      );

      if (!update) {
        throw Error("Merchant not exist");
      }

      return res.status(200).json({
        success: true,
        data: {
          message: response?.description || response?.message,
          status: data?.tranStatus,
          transactionId: data?.transactionId,
        },
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

const getTransactionType = (serviceName) => {
  const map = {
    withdrawal: "CW",
    enquiry: "BE",
    statement: "MS",
  };

  return map[serviceName?.toLowerCase()] || null;
};

exports.doTransaction = async (req, res, next) => {
  try {
    let {
      source,
      mobileDeviceId,
      latitude,
      longitude,
      bioType = "FINGER",
      transactionType,
      pidData,
      amount = 0,
      bankId,
      aadhaar,
      customerMobile,
    } = req.body;

    source = source?.trim()?.toUpperCase();
    mobileDeviceId = mobileDeviceId?.trim();
    latitude = Number(latitude);
    longitude = Number(longitude);
    bioType = bioType?.trim()?.toUpperCase();
    transactionType = transactionType?.trim()?.toLowerCase();
    bankId = bankId?.trim();
    aadhaar = aadhaar?.trim();
    customerMobile = customerMobile?.trim();
    amount = Number(amount);

    console.log(req.body, "BODY");

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = [
      "source",
      "latitude",
      "longitude",
      "bioType",
      "transactionType",
      "bankId",
      "pidData",
      "aadhaar",
      "customerMobile",
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

    if (!/^[6-9]\d{9}$/.test(customerMobile)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Indian mobile number",
      });
    }

    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(aadhaar)) {
      return res
        .status(400)
        .json({ success: false, message: "Aadhaar must be 12 digits" });
    }

    const ipAddress = (
      req.headers["x-forwarded-for"] || req.socket.remoteAddress
    )
      .split(",")[0]
      .replace("::ffff:", "")
      .trim();

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

    if (!["FINGER", "FACE", "IRIS"].includes(bioType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Bio type",
      });
    }

    if (!pidData) {
      return res
        .status(400)
        .json({ success: false, message: "PID data is required" });
    }

    if (source === "APP" && !mobileDeviceId) {
      return res.status(400).json({
        success: false,
        message: `mobileDeviceId is required`,
      });
    }

    const userAgent = req.headers["user-agent"] || "";

    console.log(userAgent, "userAgent");

    const deviceId = getMobileDeviceId(userAgent);

    if (source === "WEB") {
      mobileDeviceId = deviceId;
    }

    console.log(source, "source");
    console.log(mobileDeviceId, "mobileDeviceId");

    if (!["withdrawal", "enquiry", "statement"].includes(transactionType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Transaction Type Selected",
      });
    }

    const transactionTypeCode = getTransactionType(transactionType);

    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Bank ID",
      });
    }

    const isBankExist = await NobleAepsBank.findOne({ _id: bankId })
      .select("bankIIN bankName")
      .lean();

    if (!isBankExist) {
      return res.status(404).json({
        success: false,
        message: "Bank not found",
      });
    }

    const amountInPaise = rupeeToPaise(amount);

    //rupee comparison 100 rupee
    if (transactionType === "withdrawal" && amount < 100) {
      return res.status(400).json({
        success: false,
        message: "Minimum withdrawal amount is 100",
      });
    }

    //rupee comparison 0 rupee
    if (["enquiry", "statement"].includes(transactionType) && amount !== 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be 0 for Balance-Enquiry and Mini-Statement",
      });
    }

    const response = await initiateAepsTransaction({
      userId: userId,
      requestId: idempotency,
      channel: source,
      mobileDeviceId: mobileDeviceId ? mobileDeviceId : undefined,
      latitude,
      longitude,
      bioType,
      transactionType: transactionTypeCode,
      serviceTypeName: transactionType?.toUpperCase(), //just for logs type
      pidData,
      bankIn: isBankExist.bankIIN,
      bankName: isBankExist.bankName,
      aadhaar: aadhaar,
      customerMobile: customerMobile,
      amount: amountInPaise,
      ipAddress: ipAddress,
      userAgent: userAgent,
    });

    console.log(response, "response");

    if (
      response &&
      response?.data?.status === 1 &&
      response?.data?.statusCode === "AG0001" &&
      response?.data?.message === "Success" &&
      response?.data?.responseData?.[0]?.tranStatus === "Success"
    ) {
      const data = response?.data?.responseData?.[0];

      console.log(data, "data");

      return res.status(200).json({
        success: true,
        data: {
          referenceId: response?.referenceId,
          transactionId: response?.transactionId,
          message: response?.data?.message,
          description: response?.data?.description,
          aadhar: data?.aadhaarNumber,
          bankName: data?.bankName,
          amount: data?.amount,
          balance: data?.balance,
          miniStatement: data?.transactions,
        },
      });
    } else {
      throw Error(
        response?.message ||
          response?.data?.description ||
          response?.data?.message,
      );
    }
  } catch (error) {
    next(error);
  }
};
