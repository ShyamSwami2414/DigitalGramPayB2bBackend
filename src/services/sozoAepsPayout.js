const {
  initiatePayout,
} = require("../client/sozoWallet/apis/payout/aeronpay/payout");
const {
  aepsPayoutStatus,
} = require("../client/sozoWallet/apis/payout/aeronpay/checkPayoutStatus");
const {
  generateUniqueRefernceId,
} = require("../utils/generateUniqueReferenceId");
const { paiseToRupee } = require("../utils/money");
const { debitAepsWallet } = require("./common/walletService");
const mongoose = require("mongoose");
const { processRefund } = require("../services/common/refundService");
const PayoutTransaction = require("../models/sozopayoutTransactionModel");
const {
  validateUserPackageAndService,
} = require("./common/validateUserPackageAndService");
const { processCharges } = require("./common/chargeService");
const Transaction = require("../models/transactionModel");

exports.initiateAepsPayoutTransfer = async ({
  userId,
  requestId,
  amount, //paise
  bankAccountNumber,
  ifsc,
  name,
  email,
  phone,
  bankProfileId,
  address,
  latitude,
  longitude,
  purpose,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const referenceId = generateUniqueRefernceId(); //backend unique
    const amountInRupee = paiseToRupee(amount);
    console.log("bankProfle ID", bankProfileId);

    const { packageId, serviceId } = await validateUserPackageAndService({
      userId: userId,
      serviceName: "aeps-payout",
      pipeline: "aeps-payout1",
      amount: amount, //paise
    });

    const { openingBalance, closingBalance } = await debitAepsWallet({
      userId: userId,
      amount: amount, //paise
      serviceType: "AEPS_PAYOUT",
      serviceCategory: "PAYOUT",
      referenceId: referenceId,
      description: `Aeps Payout for ${purpose}`,
      session: session,
    });

    const { charges, gstAmount, totalCharges } = await processCharges({
      userId: userId,
      amount: amount, //paise
      packageId: packageId,
      serviceId: serviceId,
      serviceType: "AEPS_PAYOUT",
      walletType: "aeps",

      pipeline: "aeps-payout1",
      referenceId: referenceId,
      reportModel: PayoutTransaction,
      description: "Aeps Payout Charges",

      requestId: requestId,
      bankAccountNumber: bankAccountNumber,
      ifsc: ifsc,
      name: name,
      phone: phone,

      session: session,
    });

    await Transaction.create(
      [
        {
          userId: userId,
          referenceId: referenceId,
          serviceType: "AEPS_PAYOUT",
          amount: amount, //paise
          wallet: "main",
          type: "debit",
          status: "INITIATED",
          meta: {
            request: {
              userId: userId,
              requestId: requestId, //client send idempotency
              amount: amount, //paise
              bankAccount: bankAccountNumber,
              ifsc: ifsc,
              name: name,
              email: email,
              phone: phone,
              bankProfileId: bankProfileId,
              address: address,
              latitude: latitude,
              longitude: longitude,
              remarks: purpose,
            },
          },
        },
      ],
      { session: session },
    );

    await session.commitTransaction();

    let result;

    try {
      result = await initiatePayout({
        client_referenceId: referenceId,
        userId,
        requestId, //client send idempotency
        amount, //paise
        bankAccount: bankAccountNumber,
        ifsc,
        name,
        email,
        phone,
        bankProfileId: bankProfileId,
        address: address,
        latitude,
        longitude,
        remarks: purpose,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error?.response?.data?.message ||
          error?.message ||
          error?.errors ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log("aeps payout service", JSON.stringify(result, null, 2));

    console.log("Success", result?.success || result?.status);

    if (
      result?.data?.status === "SUCCESS" ||
      result?.data?.status === "PENDING"
    ) {
      try {
        await PayoutTransaction.findOneAndUpdate(
          { referenceId: referenceId },
          {
            $set: {
              status: result?.data?.status,
            },
          },
          { new: true },
        );

        console.log(result, "result");
        return result;
      } catch (error) {
        throw error;
      }
    } else if (result?.status === "FAILED") {
      const refundSession = await mongoose.startSession();
      try {
        refundSession.startTransaction();

        await processRefund({
          userId: userId,
          amount: amount, //paise
          referenceId: referenceId,
          walletType: "aeps",
          description: `Refund: AepsPayout Failed`,
          session: refundSession,
        });

        await PayoutTransaction.findOneAndUpdate(
          { referenceId },
          { $set: { status: "REVERSED" } },
          { session: refundSession },
        );

        await refundSession.commitTransaction();
      } catch (refundError) {
        if (refundSession.inTransaction()) {
          await refundSession.abortTransaction();
        }
        console.error(" Refund Sync Failed", refundError);
      } finally {
        refundSession.endSession();
      }

      const err = new Error(result?.message || "API Failed");
      err.statusCode = 400;
      err.data = result?.data;
      throw err;
    } else {
      await PayoutTransaction.findOneAndUpdate(
        { referenceId },
        { $set: { status: "PENDING" } },
      );
    }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
};

exports.checkAepsPayoutStatus = async ({
  userId,
  requestId,
  transactionId,
}) => {
  try {
    let result;

    const txn = await PayoutTransaction.findOne({
      $or: [{ referenceId: transactionId }, { bankReferenceId: transactionId }],
    });

    if (!txn) throw new Error("Transaction not found");

    try {
      result = await aepsPayoutStatus({
        client_referenceId: transactionId, //same id as the payout to keep in sync
        userId,
        requestId, //client send idempotency
        transactionId: transactionId,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error?.response?.data?.message ||
          error?.message ||
          error?.errors ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log(
      "aeps payout check status service",
      JSON.stringify(result, null, 2),
    );

    console.log("Success Key value", result?.success || result?.status);

    if (result?.success === true && result?.code === 200) {
      const status = result?.data?.status;

      await PayoutTransaction.findOneAndUpdate(
        { referenceId: transactionId },
        {
          $set: {
            status: status,
          },
        },
      );
    } else {
      const err = new Error(result?.message || "API Failed");
      err.statusCode = 400;
      err.data = result?.data;
      throw err;
    }

    console.log(result, "result");
    return result;
  } catch (error) {
    throw error;
  }
};
