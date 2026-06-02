const mongoose = require("mongoose");
const NobleDmtFinoCustomer = require("../../models/nobleFinoDmtCustomerModel");
const NobleDmtBeneficiary = require("../../models/nobleDmtBeneficiaryModel");

const { rupeeToPaise } = require("../../utils/money");
const {
  searchCustomer,
  getLimit,
  customerEkyc,
  generateRegOtp,
  registerCustomer,
  generateTOtp,
  transferFund,
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

    // const customerExist = await NobleDmtFinoCustomer.findOne({
    //
    //   mobile: mobileNumber,
    // }).select("_id customerName");

    // if (customerExist) {
    //   return res.status(200).json({
    //     success: true,
    //     message: "Customer is Already registed, proceed for further step",
    //     data: {
    //       customerName: customerExist?.customerName,
    //     },
    //   });
    // }

    const response = await searchCustomer({
      userId,
      requestId: idempotency,
      mobileNumber,
      longitude,
      latitude,
      publicIp,
    });

    console.log(response, "response controller");

    const existingCustomer = await NobleDmtFinoCustomer.findOne({
      mobile: mobileNumber,
    })
      .select("isKycDone isVerified")
      .lean();

    console.log(existingCustomer, "existingCustomer");

    if (
      response &&
      response?.data?.status === 1 &&
      response?.data?.statusCode === "SS0011"
    ) {
      const data = response?.data?.responseData?.[0];

      let customer;

      if (!existingCustomer) {
        customer = new NobleDmtFinoCustomer({
          customerName: data?.CustomerName,
          mobile: mobileNumber,
          isKycDone: true,
          isVerified: true,
        });

        await customer.save();
      } else {
        customer = existingCustomer; // already exists
        data.isKycDone = existingCustomer?.isKycDone;
        data.isVerified = existingCustomer?.isVerified;
      }

      return res.status(201).json({
        success: true,
        message: response?.message,
        data: data,
      });
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
    let {
      customerName,
      mobileNumber,
      aadharNumber,
      pidData,
      latitude,
      longitude,
      publicIp,
    } = req.body;

    customerName = customerName?.trim();
    mobileNumber = mobileNumber?.trim();
    aadharNumber = aadharNumber?.trim();
    publicIp = publicIp?.trim();
    latitude = Number(latitude);
    longitude = Number(longitude);

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = [
      "customerName",
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

    // const customerExist = await NobleDmtFinoCustomer.findOne({
    //   mobile: mobileNumber,
    //   isKycDone: true,
    // }).select("_id customerName");

    // if (customerExist) {
    //   return res.status(200).json({
    //     success: true,
    //     message: "Customer kyc already completed, proceed for further step",
    //     data: {
    //       customerName: customerExist?.customerName,
    //     },
    //   });
    // }

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

    console.log(response, "response controller kyc");

    if (
      response &&
      response?.data?.status === 1 &&
      response?.data?.statusCode === "SS0011"
    ) {
      const data = response?.data?.responseData?.[0];

      const update = await NobleDmtFinoCustomer.findOneAndUpdate(
        {
          mobile: mobileNumber,
        },
        {
          $set: {
            ekycRequestId: data?.RequestId,
            isKycDone: true,
          },
          $setOnInsert: {
            userId: userId,
            customerName: customerName,
            mobile: mobileNumber,
            aadharNumber: aadharNumber,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      );

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

    const customerExist = await NobleDmtFinoCustomer.findOne({
      mobile: mobileNumber,
      isKycDone: true,
      isVerified: true,
    }).select("_id customerName");

    if (customerExist) {
      return res.status(200).json({
        success: true,
        message: "Customer already registerd, proceed for further step",
        data: {
          customerName: customerExist?.customerName,
        },
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

      const update = await NobleDmtFinoCustomer.findOneAndUpdate(
        {
          mobile: mobileNumber,
        },
        {
          $set: {
            otpRequestId: data?.OtpRequestId,
          },
        },
      );

      return res.status(201).json({
        success: true,
        message: response?.message,
        // data: data,
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

    const otpRegex = /^\d{4}$/;

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

    const customerExist = await NobleDmtFinoCustomer.findOne({
      mobile: mobileNumber,
      isKycDone: true,
      isVerified: true,
    }).select("_id customerName");

    if (customerExist) {
      return res.status(200).json({
        success: true,
        message: "Customer already registerd, proceed for further step",
        data: {
          customerName: customerExist?.customerName,
        },
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
      response?.data?.statusCode === "DB0031"
    ) {
      const data = response?.data?.responseData?.[0];

      const update = await NobleDmtFinoCustomer.findOneAndUpdate(
        {
          mobile: mobileNumber,
        },
        {
          $set: {
            isVerified: true,
          },
        },
      );

      return res.status(201).json({
        success: true,
        message: response?.message,
        data: {
          transactionId: data?.transactionId,
          message: data?.detail,
        },
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

const generateTransactionOtp = async (req, res, next) => {
  try {
    let { mobileNumber, latitude, longitude, publicIp } = req.body;

    console.log("body", req.body);

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

    const response = await generateTOtp({
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

      const update = await NobleDmtFinoCustomer.findOneAndUpdate(
        {
          mobile: mobileNumber,
        },
        {
          $set: {
            tOtpRequestId: data?.OtpRequestId,
          },
        },
      );

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

const initiateTransaction = async (req, res, next) => {
  try {
    let {
      mobileNumber,
      latitude,
      longitude,
      publicIp,
      otp,
      amount,
      beneficiaryAccount,
    } = req.body;

    console.log(req.body, "body");

    mobileNumber = mobileNumber?.trim();
    publicIp = publicIp?.trim();
    latitude = Number(latitude);
    longitude = Number(longitude);
    otp = otp?.trim();
    amount = Number(amount);
    beneficiaryAccount = beneficiaryAccount?.trim();

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = [
      "mobileNumber",
      "latitude",
      "longitude",
      "publicIp",
      "otp",
      "amount",
      "beneficiaryAccount",
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

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    if (amount < 100) {
      //rupee
      return res.status(400).json({
        success: false,
        message: "Minimum amount must be 100",
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

    const otpRegex = /^\d{4}$/;

    if (!otpRegex.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    if (!/^[0-9]{9,18}$/.test(beneficiaryAccount)) {
      throw new Error("Invalid beneficiary account number");
    }

    const isValidBeneficiary = await NobleDmtBeneficiary.findOne({
      accountNumber: beneficiaryAccount,
      remitterMobile: mobileNumber,
    });

    if (!isValidBeneficiary) {
      return res.status(404).json({
        success: false,
        message: "Beneficiary not found",
      });
    }

    const amountInPaise = rupeeToPaise(amount);

    const response = await transferFund({
      userId,
      requestId: idempotency,
      mobileNumber,
      latitude,
      longitude,
      publicIp,
      otp: otp,
      amount: amountInPaise,
      beneficiaryId: isValidBeneficiary?._id,
      beneficiaryName: isValidBeneficiary?.accountHolderName,
      beneficiaryAccount: isValidBeneficiary?.accountNumber,
      beneficiaryIfsc: isValidBeneficiary?.ifsc,
    });

    console.log("response controller:", JSON.stringify(response, null, 2));

    if (
      response &&
      response?.data?.status === 1 &&
      response?.data?.statusCode === "DB0031"
    ) {
      const data = response?.data?.responseData?.[0];

      // const update = await NobleDmtFinoCustomer.findOneAndUpdate(
      //   {
      //     mobile: mobileNumber,
      //   },
      //   {
      //     $set: {
      //       tOtpRequestId: data?.OtpRequestId,
      //     },
      //   },
      // );

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
  generateTransactionOtp,
  initiateTransaction,
};
