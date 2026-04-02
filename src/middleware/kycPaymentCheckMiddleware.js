const Role = require("../models/roleModel"); // Your Role model
const User = require("../models/userModel"); // Your Role model

const checkUserPaymentAndKYC = async (req, res, next) => {
  try {
    console.log("req.user:", req.user);
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No user info found KPCM",
      });
    }

    const loggedUser = await User.findOne({
      _id: req.user.id,
      isActive: true,
      isDeleted: false,
    }).lean();

    if (!loggedUser) {
      return res.status(401).json({
        success: false,
        message: "No Active User Exist KPCM",
      });
    }

    const { role: roleId } = req.user;

    console.log(loggedUser.kycStatus, "kycStatus");
    console.log(loggedUser.isPaymentDone, "isPaymentDone");

    const role = await Role.findById(roleId).lean();

    console.log(role, "role KPCM");
    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found " });
    }

    const isPaymentRequired = role.isPaymentRequired;
    const kycStatus = loggedUser.kycStatus;
    const isPaymentDone = loggedUser.isPaymentDone;
    console.log(isPaymentRequired, "isPaymentRequired");

    if (kycStatus !== "approved") {
      return res
        .status(403)
        .json({ success: false, message: "KYC not approved" });
    }

    if (isPaymentRequired) {
      console.log("entered");

      if (isPaymentDone !== true) {
        console.log("entered 2");
        return res.status(403).json({
          success: false,
          message: "Payment Pending",
        });
      }
    }

    next();
  } catch (error) {
    console.error("Middleware error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = checkUserPaymentAndKYC;
