const Role = require("../models/roleModel"); // Your Role model

const checkUserPaymentAndKYC = async (req, res, next) => {
  try {
    console.log("req.user:", req.user);
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No user info found KPCM",
      });
    }
    const { role: roleId, isPaymentDone, kycStatus } = req.user;

    const role = await Role.findById(roleId).lean();

    console.log(role, "role KPCM");
    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found " });
    }

    if (kycStatus !== "approved") {
      return res
        .status(403)
        .json({ success: false, message: "KYC not approved" });
    }

    // console.log(isPaymentDone, "isPaymentDone KPCM");

    // if (role.isPaymentRequired === true) {
    //   console.log("entered");

    //   if (isPaymentDone !== true) {
    //     console.log("entered 2");
    //     return res.status(403).json({
    //       success: false,
    //       message: "Payment Pending",
    //     });
    //   }
    // }

    next();
  } catch (error) {
    console.error("Middleware error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = checkUserPaymentAndKYC;
