const mongoose = require("mongoose");
const InstantAepsOutlet = require("../../models/instantAepsOutletModel");

const { parseMantraXml } = require("../../helpers/formatMantraBiometricData");
const { encryptAadhaar } = require("../../helpers/encryptDecryptAadhar");
const {
  validateBiometricSchema,
} = require("../../validators/biometricDataValidator");
const { rupeeToPaise } = require("../../utils/money");
const {
  searchCustomer,
  getLimit,
  customerEkyc,
  generateRegOtp,
  registerCustomer,
} = require("../../services/nobleFinoDmtService");

const getCustomer = async (req, res, next) => {
  try {
    let { mobileNumber, longitude, latitude, publicIp } = req.body;

    mobileNumber = mobileNumber?.trim();
    publicIp = publicIp?.trim();
    latitude = Number(latitude);
    longitude = Number(longitude);

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = [
      "mobileNumber",
      "publicIp",
      "latitude",
      "longitude",
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

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid mobile number" });
    }

    function isValidIPv4(ip) {
      const ipv4Regex =
        /^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$/;
      return ipv4Regex.test(ip);
    }

    const isValid = isValidIPv4(publicIp);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Public IP is invalid",
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

    const response = await searchCustomer({
      userId,
      requestId: idempotency,
      mobileNumber,
      longitude,
      latitude,
      publicIp,
    });

    console.log(response, "response controller");

    if (
      response &&
      response?.data?.status === 1 &&
      response?.data?.statusCode === "SS0011"
    ) {
      const data = response?.data?.responseData?.[0];

      return res.status(201).json({
        success: true,
        message: response?.message,
        data: data,
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

const checkLimit = async (req, res, next) => {
  try {
    let { mobileNumber } = req.body;

    mobileNumber = mobileNumber?.trim();

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = ["mobileNumber"];

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

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNumber)) {
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

    const response = await getLimit({
      userId,
      requestId: idempotency,
      mobileNumber,
    });

    console.log(response, "response controller");

    if (
      response &&
      response?.data?.status === 1 &&
      response?.data?.statusCode === "SS0011"
    ) {
      const data = response?.data?.responseData?.[0];

      return res.status(201).json({
        success: true,
        message: response?.message,
        data: data,
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

const doCustomerKyc = async (req, res, next) => {
  try {
    let { mobileNumber, aadharNumber, pidData, latitude, longitude, publicIp } =
      req.body;

    mobileNumber = mobileNumber?.trim();
    aadharNumber = aadharNumber?.trim();
    publicIp = publicIp?.trim();
    latitude = Number(latitude);
    longitude = Number(longitude);

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = [
      "mobileNumber",
      "aadharNumber",
      "pidData",
      "latitude",
      "longitude",
      "publicIp",
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

    if (!pidData) {
      return res
        .status(400)
        .json({ success: false, message: "Pid Data is required" });
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid mobile number" });
    }

    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(aadharNumber)) {
      return res
        .status(400)
        .json({ success: false, message: "Aadhaar must be 12 digits" });
    }

    function isValidIPv4(ip) {
      const ipv4Regex =
        /^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$/;
      return ipv4Regex.test(ip);
    }

    const isValid = isValidIPv4(publicIp);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Public IP is invalid",
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

    const response = await customerEkyc({
      userId,
      requestId: idempotency,
      mobileNumber,
      aadharNumber,
      pidData,
      latitude,
      longitude,
      publicIp,
    });

    console.log(response, "response controller");

    if (
      response &&
      response?.data?.status === 1 &&
      response?.data?.statusCode === "SS0011"
    ) {
      const data = response?.data?.responseData?.[0];

      return res.status(201).json({
        success: true,
        message: response?.message,
        data: data,
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

const generateRegistrationOtp = async (req, res, next) => {
  try {
    let { mobileNumber, latitude, longitude, publicIp } = req.body;

    mobileNumber = mobileNumber?.trim();
    publicIp = publicIp?.trim();
    latitude = Number(latitude);
    longitude = Number(longitude);

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = [
      "mobileNumber",
      "latitude",
      "longitude",
      "publicIp",
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

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid mobile number" });
    }

    function isValidIPv4(ip) {
      const ipv4Regex =
        /^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$/;
      return ipv4Regex.test(ip);
    }

    const isValid = isValidIPv4(publicIp);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Public IP is invalid",
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

    const response = await generateRegOtp({
      userId,
      requestId: idempotency,
      mobileNumber,
      latitude,
      longitude,
      publicIp,
    });

    console.log(response, "response controller");

    if (
      response &&
      response?.data?.status === 1 &&
      response?.data?.statusCode === "SS0011"
    ) {
      const data = response?.data?.responseData?.[0];

      return res.status(201).json({
        success: true,
        message: response?.message,
        data: data,
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

const registerNewCustomer = async (req, res, next) => {
  try {
    let { mobileNumber, latitude, longitude, publicIp, otp } = req.body;

    mobileNumber = mobileNumber?.trim();
    publicIp = publicIp?.trim();
    otp = otp?.trim();
    latitude = Number(latitude);
    longitude = Number(longitude);

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = [
      "mobileNumber",
      "latitude",
      "longitude",
      "publicIp",
      "otp",
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

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid mobile number" });
    }

    const otpRegex = /^\d{6}$/;

    if (!otpRegex.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    function isValidIPv4(ip) {
      const ipv4Regex =
        /^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$/;
      return ipv4Regex.test(ip);
    }

    const isValid = isValidIPv4(publicIp);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Public IP is invalid",
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

    const response = await registerCustomer({
      userId,
      requestId: idempotency,
      mobileNumber,
      latitude,
      longitude,
      publicIp,
      otp,
    });

    console.log(response, "response controller");

    if (
      response &&
      response?.data?.status === 1 &&
      response?.data?.statusCode === "SS0011"
    ) {
      const data = response?.data?.responseData?.[0];

      return res.status(201).json({
        success: true,
        message: response?.message,
        data: data,
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomer,
  checkLimit,
  doCustomerKyc,
  generateRegistrationOtp,
  registerNewCustomer,
};
