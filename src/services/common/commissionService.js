const mongoose = require("mongoose");
const UserWallet = require("../../models/userWallet");
const WalletLedger = require("../../models/walletLedgerModel");
const { calculateCommission } = require("../../helpers/calculateCommission");
const { calculateTds } = require("../../helpers/calculateTds");
const Transaction = require("../../models/transactionModel");
const TdsLedger = require("../../models/tdsLedgerModel");
const { splitCommission } = require("../../helpers/splitCommission");

const processCommission = async ({
  userId,
  amount, //paise
  packageId,
  serviceId,
  operatorId = null,
  pipeline,
  referenceId,
  providerTxnId = null,
  reportModel, //dynamic (RechargeReport, BBPSReport, etc.)
  description,
  apiResponse = null,
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
      pipeline,
    });

    console.log("commission", commission);

    const tdsAmount = calculateTds(commission); //paise
    const netCommission = commission - tdsAmount; //payable to user

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
        providerTxnId: referenceId,
      },
      { session },
    );

    await TdsLedger.create(
      [
        {
          userId: userId,
          referenceId: referenceId,
          commissionAmount: commission,
          tdsRate: 5, //percent
          netCommission: netCommission,
          tdsAmount: tdsAmount,
        },
      ],
      { session: session },
    );

    // await Transaction.updateOne(
    //   {
    //     referenceId: referenceId,
    //   },
    //   {
    //     $set: {
    //       status: "SUCCESS",
    //       providerTxnId: providerTxnId,
    //       remark: apiResponse ? apiResponse?.message : "",
    //       "meta.response": apiResponse,
    //     },
    //   },
    //   { session },
    // );

    await splitCommission({
      userId: userId,
      amount: amount, //paise
      serviceId: serviceId,
      operatorId: operatorId,
      pipeline: pipeline,
      referenceId: referenceId,
      session: session,
    });

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
