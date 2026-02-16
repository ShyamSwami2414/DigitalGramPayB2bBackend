const Kyc = require("../../models/kycModel");
const User = require("../../models/userModel");
const mongoose = require("mongoose");

exports.updateKycStatus = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const { id } = req.params;
    let { status, rejectionReason = "" } = req.body;
    status = status?.trim();
    rejectionReason = rejectionReason?.trim();

    const allowedStatus = ["approved", "rejected", "pending"];

    if (!id || !status) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "Details Missing" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    if (status?.toLowerCase() === "rejected" && !rejectionReason) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "Rejection Reason is required" });
    }

    if (!allowedStatus.includes(status.toLowerCase())) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "Invalid Status Change" });
    }

    const kyc = await Kyc.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        $set: {
          status: status,
          rejectionReason: rejectionReason,
        },
      },
      { new: true },
    ).session(session);

    if (!kyc) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Kyc Not Found" });
    }

    if (kyc?.status === "approved") {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "Kyc is already Approved" });
    }

    const user = await User.findOneAndUpdate(
      { _id: kyc?.userId, isDeleted: false },
      {
        $set: {
          kycStatus: status,
        },
      },
      { new: true },
    ).session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "User Not Found" });
    }

    await session.commitTransaction();
    session.endSession();

    return res
      .status(200)
      .json({ success: true, message: "Kyc Updated", data: kyc });
  } catch (error) {
    console.error("Error updating kyc status:", error);
    await session.abortTransaction();
    session.endSession();
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.getKycData = async (req, res) => {
  try {
    let { page = 1, limit = 10, status = "", search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    status = status.trim();
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

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const [kycData, total] = await Promise.all([
      Kyc.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Kyc.countDocuments(filter),
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
