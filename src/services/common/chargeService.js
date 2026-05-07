const mongoose = require("mongoose");
const UserWallet = require("../../models/userWallet");
const WalletLedger = require("../../models/walletLedgerModel");
const { calculateCommission } = require("../../helpers/calculateCommission");
const { calculateTds } = require("../../helpers/calculateTds");
const Transaction = require("../../models/transactionModel");
const TdsLedger = require("../../models/tdsLedgerModel");
const GstLedger = require("../../models/gstLedgerModel");
const {
  splitCommission,
  applyChargeHierarchy,
} = require("../../helpers/splitCommission");
const { paiseToRupee } = require("../../utils/money");
const { calculateGst } = require("../../helpers/calculateGst");
const PayoutTransaction = require("../../models/sozopayoutTransactionModel");

const processCharges = async ({
  userId,
  amount, //paise
  packageId,
  serviceId,
  serviceType,
  serviceCategory,
  walletType,
  operatorId = null,
  categoryId = null,
  pipeline,
  referenceId,
  reportModel, //dynamic (RechargeReport, BBPSReport, etc.)
  description,
  requestId,
  bankAccountNumber,
  ifsc,
  name,
  phone,

  session: providedSession = null,
}) => {
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
    if (!walletType) {
      throw new Error(`Wallet Type is required`);
    }

    const walletConfig = {
      main: {
        balance: "mainWallet",
        hold: "mainHoldAmount",
      },
      aeps: {
        balance: "aepsWallet",
        hold: "aepsHoldAmount",
      },
    };

    if (!walletConfig[walletType]) {
      throw new Error(`Invalid walletType: ${walletType}`);
    }

    const { balance, hold } = walletConfig[walletType];

    //this will calculate both charge and commission
    const charges = await calculateCommission({
      amount, //paise
      packageId,
      serviceId,
      operatorId,
      pipeline,
    });

    console.log("charges in paise", charges);

    const gstAmount = calculateGst(charges); //paise
    const totalCharges = charges + gstAmount; //payable by user
    const totalDebitAmount = amount + totalCharges; //payable by user

    if (paiseToRupee(totalDebitAmount) > 0) {
      const wallet = await UserWallet.findOneAndUpdate(
        {
          userId: userId,
          isActive: true,
          isDeleted: false,
          $expr: {
            $gte: [
              { $subtract: [`$${balance}`, `$${hold}`] },
              totalDebitAmount,
            ],
          },
        },
        {
          $inc: { [balance]: -totalDebitAmount }, //this will deduct amount charges including gst
        },
        { new: true, session },
      );

      if (!wallet) {
        throw new Error(
          `Insufficient Wallet Balance or Wallet not found for user ${userId}`,
        );
      }

      closingBalance = wallet[balance];
      openingBalance = closingBalance + totalDebitAmount;

      await WalletLedger.create(
        [
          {
            userId: userId,
            serviceType: serviceType,
            serviceCategory: serviceCategory,
            entryType: "PAYOUT",
            wallet: walletType,
            type: "debit",
            amount: totalDebitAmount, //with charge and gst
            referenceId: referenceId,
            openingBalance: openingBalance,
            closingBalance: closingBalance,
            description: description,
          },
        ],
        { session: session },
      );

      await GstLedger.create(
        [
          {
            userId: userId,
            referenceId: referenceId,
            chargesAmount: charges,
            gstRate: 18, //percent
            gstAmount: gstAmount,
            totalCharge: totalCharges,
            serviceType: serviceType,
          },
        ],
        { session: session },
      );
    }

    if (serviceType !== "DMT") {
      await PayoutTransaction.create(
        [
          {
            userId: userId,
            serviceType: serviceType,
            referenceId: referenceId,
            idempotencyKey: requestId,
            bankAccount: bankAccountNumber,
            ifsc: ifsc,
            beneficiaryName: name,
            beneficiaryPhone: phone,
            amount: amount,
            charge: charges,
            gst: gstAmount,
            totalDebit: totalDebitAmount,
            status: "INITIATED",
          },
        ],
        { session: session },
      );
    }

    if (isInternalSession) {
      await session.commitTransaction();
    }

    return { charges, gstAmount, totalCharges, totalDebitAmount };
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
  processCharges,
};
