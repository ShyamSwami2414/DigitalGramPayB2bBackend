const Kyc = require("../../models/kycModel");

exports.getKycData = async (req, res) => {
  try {

    let { page = 1, limit = 10, status = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    if (isNaN(page) || isNaN(limit) || page <= 0 || limit <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid page or limit" });
    }

    const filter = { isDeleted: false };
    if (status) {
      filter.status = status.toLowerCase();
    }

    const [kycData, total] = await Promise.all([
      Kyc.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Kyc.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      message: "KYC data fetched successfully",
      data: kycData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error("Error fetching KYC data:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

