exports.authorizeUserRoles = (...allowedRoles) => {
  return (req, res, next) => {
    console.log("User Role:", req.user?.role);
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }
    next();
  };
};
