const mongoose = require("mongoose");
const UserWallet = require("../../models/userWallet");
const WalletLedger = require("../../models/walletLedgerModel");
const { calculateCommission } = require("../../helpers/calculateCommission");
const { calculateTds } = require("../../helpers/calculateTds");
const Transaction = require("../../models/transactionModel");
const TdsLedger = require("../../models/tdsLedgerModel");
const { splitCommission } = require("../../helpers/splitCommission");
const { paiseToRupee } = require("../../utils/money");

const processCommission = async ({
  userId,
  amount, //paise
  packageId,
  serviceId,
  serviceType,
  walletType = "main",
  serviceCategory,
  operatorId = null,
  categoryId = null,
  pipeline,
  referenceId,
  providerTxnId = null,
  reportModel, //dynamic (RechargeReport, BBPSReport, etc.)
  description,
  apiMessage = "",
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
    const commission = await calculateCommission({
      amount, //paise
      packageId,
      serviceId,
      operatorId,
      pipeline,
    });

    console.log("commission paise", commission);

    const tdsAmount = calculateTds(commission); //paise
    const netCommission = commission - tdsAmount; //payable to user

    if (paiseToRupee(commission) > 0) {
      const wallet = await UserWallet.findOneAndUpdate(
        { userId, isActive: true, isDeleted: false },
        { $inc: { [walletField]: netCommission } },
        { new: true, session },
      );

      closingBalance = wallet[walletField];
      openingBalance = closingBalance - netCommission;

      await WalletLedger.updateOne(
        { referenceId: referenceId, serviceType: serviceType },
        { status: "SUCCESS" },
        { session: session },
      );

      await WalletLedger.create(
        [
          {
            userId,
            serviceType: serviceType,
            serviceCategory: serviceCategory,
            entryType: "COMMISSION",
            wallet: walletType,
            type: "credit",
            amount: netCommission,
            referenceId: referenceId,
            openingBalance: openingBalance,
            closingBalance: closingBalance,
            description: description,
          },
        ],
        { session: session },
      );

      if (reportModel) {
        await reportModel.updateOne(
          { referenceId: referenceId },
          {
            status: "SUCCESS",
            commission,
            tds: tdsAmount,
            netCommission,
            providerTxnId: referenceId,
            description: apiMessage,
          },
          { session: session },
        );
      }

      await TdsLedger.create(
        [
          {
            userId: userId,
            referenceId: referenceId,
            commissionAmount: commission,
            tdsRate: 2, //percent
            netCommission: netCommission,
            tdsAmount: tdsAmount,
          },
        ],
        { session: session },
      );
    }

    await Transaction.updateOne(
      {
        referenceId: referenceId,
      },
      {
        $set: {
          status: "SUCCESS",
          providerTxnId: providerTxnId,
          remark: apiResponse ? apiResponse?.message : "",
          "meta.response": apiResponse,
        },
      },
      { session: session },
    );

    await splitCommission({
      userId: userId,
      amount: amount, //paise
      serviceId: serviceId,
      serviceType: serviceType,
      walletType: "main",
      serviceCategory: serviceCategory,
      operatorId: operatorId,
      categoryId: categoryId,
      pipeline: pipeline,
      referenceId: referenceId,
      session: session,
    });

    if (isInternalSession) {
      await session.commitTransaction();
    }

    return { commission, tdsAmount, netCommission };
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
  processCommission,
};
