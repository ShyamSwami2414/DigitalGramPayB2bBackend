const Kyc = require("../../models/kycModel");
const User = require("../../models/userModel");
const mongoose = require("mongoose");
const { kycStatusTemplate } = require("../../templates/emailTemplates/kycEmail");
const { sendEmail } = require("../../utils/email");

exports.getKycData = async (req, res, next) => {
  try {
    let { page = 1, limit = 10, status = "", search = "" } = req.query;

    page = Number(page);
    limit = Number(limit);
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

    const [kycs, total] = await Promise.all([
      Kyc.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Kyc.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "KYC data fetched successfully",
      data: kycs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getKycById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID"
      });
    }

    const kyc = await Kyc.findById(id).lean();

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "Kyc Not Found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "KYC fetched successfully",
      data: kyc,
    });

  } catch (error) {
    next(error);
  }
};

exports.getKycByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID"
      });
    }

    const userExist = await User.findById(userId).lean();

    if (!userExist) {
      return res.status(404).json({
        success: false,
        message: "User Not Found"
      });
    }

    const kyc = await Kyc.findOne({ userId: userId, isDeleted: false }).lean();

    console.log(kyc, "Kyc By User ID")

    if (!kyc) {
      return res.status(400).json({
        success: false,
        message: "Kyc Not Found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "KYC fetched successfully",
      data: kyc,
    });

  } catch (error) {
    next(error);
  }
};

exports.updateSectionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { section, status } = req.body;
    section = section?.trim();
    status = status?.trim();

    const allowedSections = ["personalDetailStatus", "businessDetailStatus", "bankDetailStatus", "identityDetailStatus"];
    const allowedStatus = ["approved", "rejected", "pending"];

    if (!id || !section || !status) {
      return res.status(400).json({
        success: false,
        message: "Details Missing"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID"
      });
    }

    if (!allowedSections.includes(section)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Section name"
      });
    }

    if (!allowedStatus.includes(status?.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid Status name"
      });
    }

    const kyc = await Kyc.findByIdAndUpdate(id, {
      $set: {
        [section]: status,
      }
    }, { new: true });

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "Kyc Not Found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Section status updated successfully",
      data: kyc,
    });

  } catch (error) {
    next(error);
  }

}

exports.updateOverAllKycStatus = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const { id } = req.params;
    let { status, reason = "" } = req.body;
    status = status?.trim();
    reason = reason?.trim();

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

    if (status?.toLowerCase() === "rejected" && !reason) {
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

    const kyc = await Kyc.findOne({ _id: id, isDeleted: false })

    if (!kyc) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Kyc Not Found" });
    }

    if (
      status?.toLowerCase() === "approved" &&
      (kyc.personalDetailStatus?.toLowerCase() !== "approved" ||
        kyc.businessDetailStatus?.toLowerCase() !== "approved" ||
        kyc.bankDetailStatus?.toLowerCase() !== "approved" ||
        kyc.identityDetailStatus?.toLowerCase() !== "approved")) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "All sections must be approved before approving kyc" });
    }

    kyc.status = status?.toLowerCase();
    kyc.rejectionReason = reason;
    kyc.reviewedBy = req.user.id;
    kyc.reviewedAt = new Date();
    await kyc.save({ session });

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

    const html = kycStatusTemplate({
      name: user.firstName,
      status: status?.toLowerCase(),
      rejectionReason: reason,
      company: "B2B"
    })

    await sendEmail({
      to: user.email,
      cc: [],
      bcc: [],
      subject: `KYC Verification ${status?.toLowerCase() === "approved" ? "Approved" : "Rejected"}`,
      html,
    });

    await session.commitTransaction();
    session.endSession();

    return res
      .status(200)
      .json({ success: true, message: "Kyc Updated", data: kyc });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
}