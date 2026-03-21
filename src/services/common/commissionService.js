const mongoose = require("mongoose");
const UserWallet = require("../../models/userWallet");
const WalletLedger = require("../../models/walletLedgerModel");
const { calculateCommission } = require("../../helpers/calculateCommission");
const { calculateTds } = require("../../helpers/calculateTds");

const processCommission = async ({
  userId,
  amount, //paise
  packageId,
  serviceId,
  operatorId = null,
  referenceId,
  providerTxnId = null,
  reportModel, //dynamic (RechargeReport, BBPSReport, etc.)
  description,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let openingBalance = 0;
  let closingBalance = 0;
  try {
    const commission = await calculateCommission({
      amount, //paise
      packageId,
      serviceId,
      operatorId,
    });

    console.log("commission", commission);

    const tdsAmount = calculateTds(commission);
    const netCommission = commission - tdsAmount;

    const wallet = await UserWallet.findOneAndUpdate(
      { userId, isActive: true, isDeleted: false },
      { $inc: { mainWallet: netCommission } },
      { new: true, session },
    );

    closingBalance = wallet.mainWallet;
    openingBalance = closingBalance - netCommission;

    await WalletLedger.create(
      [
        {
          userId,
          serviceType: "COMMISSION",
          wallet: "main",
          type: "credit",
          amount: netCommission,
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
      {
        status: "SUCCESS",
        commission,
        tds: tdsAmount,
        netCommission,
        providerTxnId: providerTxnId,
      },
      { session },
    );

    await session.commitTransaction();

    return { commission, tdsAmount, netCommission };
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
  processCommission,
};
