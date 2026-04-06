const InstantAepsOutlet = require("../../models/instantAepsOutletModel");
const {
  instantAepsOutletRegister,
  checkBiometricKycStatus,
} = require("../../services/instantAepsService");

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
      const outletRegister = new InstantAepsOutlet({
        userId,
        name,
        email,
        mobile,
        aadhaar,
        pan,
        dateOfBirth,
        gender,
        longitude,
        latitude,
        address,
      });

      await outletRegister.save();
      res.status(201).json({
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
  } catch (error) {
    next(error);
  }
};

const completetBiometricKyc = async (req, res, next) => {
  try {
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerOutlet,
  getBiometricKycStatus,
  completetBiometricKyc,
};
