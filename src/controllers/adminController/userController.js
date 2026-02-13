const User = require("../../models/userModel");

exports.getAllUsers = async (req, res) => {
  try {
    let { page = 1, limit = 10, status = "", search = "" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    status = status.trim();

    const skip = (page - 1) * limit;
    const filter = { isDeleted: false };

    if (isNaN(page) || isNaN(limit) || page <= 0 || limit <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid page or limit" });
    }

    if (status && status.toLowerCase() === "active") {
      filter.isActive = true;
    } else if (status && status.toLowerCase() === "inactive") {
      filter.isActive = false;
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};
