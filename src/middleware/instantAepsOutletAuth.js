const Merchant = require("../models/instantAepsOutletModel");

const checkAepsSession = async (req, res, next) => {
  try {
    const userId = req.user.id;

    console.log(userId, "userId");

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required IAOM",
      });
    }

    const outlet = await Merchant.findOne({ userId: userId });

    console.log("outlet", outlet);

    if (!outlet) {
      return res.status(404).json({
        status: false,
        message: "Outlet not registered for AePS IAOM",
      });
    }

    const now = new Date();
    const lastLogin = outlet.lastLoginAt ? new Date(outlet.lastLoginAt) : null;

    let needsLogin = false;

    if (outlet.isLoginRequired || !lastLogin) {
      needsLogin = true;
    } else {
      const isDifferentDay = now.toDateString() !== lastLogin.toDateString();

      const isOver24Hours = now - lastLogin > 24 * 60 * 60 * 1000;

      if (isDifferentDay || isOver24Hours) {
        needsLogin = true;
      }
    }

    if (needsLogin) {
      await Merchant.updateOne({ userId }, { $set: { isLoginRequired: true } });

      return res.status(403).json({
        status: "FAILED",
        message: `AePS Session Expired, Please perform Daily Login.`,
        code: "AEPS_LOGIN_REQUIRED",
      });
    }

    req.outlet = outlet;
    next();
  } catch (error) {
    console.error("Middleware Error:", error);
    res.status(500).json({ status: "ERR", message: "Internal Server Error" });
  }
};

module.exports = checkAepsSession;
