const UserWallet = require("../../models/userWallet");
const WalletLedger = require("../../models/walletLedgerModel");
const Transaction = require("../../models/transactionModel");
const mongoose = require("mongoose");

const processRefund = async ({
  userId,
  amount, //paise
  referenceId,
  reportModel = null,
  description,
  apiResponse = null,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let openingBalance = 0;
  let closingBalance = 0;

  try {
    const wallet = await UserWallet.findOneAndUpdate(
      { userId, isActive: true, isDeleted: false },
      { $inc: { mainWallet: amount } },
      { new: true, session },
    );

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    closingBalance = wallet.mainWallet;
    openingBalance = closingBalance - amount;

    await WalletLedger.create(
      [
        {
          userId,
          serviceType: "REFUND",
          wallet: "main",
          type: "credit",
          amount, //paise
          referenceId,
          openingBalance,
          closingBalance,
          description,
        },
      ],
      { session },
    );

    if (reportModel) {
      await reportModel.updateOne(
        { referenceId },
        { $set: { status: "FAILED", isRefunded: true } },
        { session },
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
      );
    }

    await session.commitTransaction();

    return { openingBalance, closingBalance };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  processRefund,
};
