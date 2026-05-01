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

    if (paiseToRupee(charges) > 0) {
      const wallet = await UserWallet.findOneAndUpdate(
        {
          userId: userId,
          isActive: true,
          isDeleted: false,
          $expr: {
            $gte: [
              { $subtract: ["$mainWallet", "$mainHoldAmount"] },
              totalCharges,
            ],
          },
        },
        { $inc: { mainWallet: -totalCharges } }, //this will deduct charges including gst
        { new: true, session: session },
      );

      if (!wallet) {
        throw new Error(`Wallet not found for user ${userId}`);
      }

      closingBalance = wallet.mainWallet;
      openingBalance = closingBalance + totalCharges;

      await WalletLedger.create(
        [
          {
            userId: userId,
            serviceType: serviceType,
            serviceCategory: serviceCategory,
            entryType: "CHARGES",
            wallet: "main",
            type: "debit",
            amount: totalCharges, //with gst
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

    let payoutTxn = await PayoutTransaction.create(
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

    if (isInternalSession) {
      await session.commitTransaction();
    }

    return { charges, gstAmount, totalCharges };
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
