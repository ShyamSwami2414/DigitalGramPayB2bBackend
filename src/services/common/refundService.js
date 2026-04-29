const UserWallet = require("../../models/userWallet");
const WalletLedger = require("../../models/walletLedgerModel");
const Transaction = require("../../models/transactionModel");
const mongoose = require("mongoose");

const processRefund = async ({
  userId,
  amount, //paise
  referenceId,
  serviceType = null,
  serviceCategory = null,
  walletType = "main",
  reportModel = null,
  description,
  apiResponse = null,
  session: providedSession = null,
}) => {
  if (!["main", "aeps"].includes(walletType)) {
    throw new Error("Invalid wallet type");
  }

  const walletField = walletType === "main" ? "mainWallet" : "aepsWallet";

  let session = providedSession;
  let isInternalSession = false;

  if (!session) {
    session = await mongoose.startSession();
    session.startTransaction();
    isInternalSession = true;
  }

  let openingBalance = 0;
  let closingBalance = 0;

  try {
    const wallet = await UserWallet.findOneAndUpdate(
      { userId, isActive: true, isDeleted: false },
      { $inc: { [walletField]: amount } },
      { new: true, session },
    );

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    closingBalance = wallet[walletField];
    openingBalance = closingBalance - amount;

    await WalletLedger.updateOne(
      { referenceId: referenceId, serviceType: serviceType },
      { status: "FAILED" },
      { session: session },
    );

    await WalletLedger.create(
      [
        {
          userId,
          serviceType: serviceType,
          serviceCategory: serviceCategory,
          entryType: "REFUND",
          wallet: walletType,
          type: "credit",
          amount, //paise
          referenceId,
          openingBalance,
          closingBalance,
          description,
        },
      ],
      { session: session },
    );

    if (reportModel) {
      await reportModel.updateOne(
        { referenceId },
        { $set: { status: "FAILED", isRefunded: true } },
        { session: session },
      );

      await Transaction.updateOne(
        { referenceId: referenceId },
        {
          $set: {
            status: "FAILED",
            isRefunded: true,
            remark: apiResponse ? apiResponse?.message : "",
            "meta.response": apiResponse,
          },
        },
        { session: session },
      );
    }

    if (isInternalSession) {
      await session.commitTransaction();
    }

    return { openingBalance, closingBalance };
  } catch (error) {
    if (isInternalSession && session.inTransaction()) {
      await session.abortTransaction();
    }

    throw error;
  } finally {
    if (isInternalSession) {
      session.endSession();
    }
  }
};

module.exports = {
  processRefund,
};
