const UserWallet = require("../../models/userWallet");
const WalletLedger = require("../../models/walletLedgerModel");
const mongoose = require("mongoose");

const processRefund = async ({
  userId,
  amount, //rupee
  referenceId,
  reportModel,
  description,
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
          amount,
          referenceId,
          openingBalance,
          closingBalance,
          description,
        },
      ],
      { session },
    );

    await reportModel.updateOne(
      { referenceId },
      { $set: { status: "FAILED", isRefunded: true } },
      { session },
    );

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
