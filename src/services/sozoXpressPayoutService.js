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
const { debitWallet } = require("./common/walletService");
const mongoose = require("mongoose");
const { processRefund } = require("../services/common/refundService");
const PayoutTransaction = require("../models/sozopayoutTransactionModel");

exports.initiateXpressPayoutTransfer = async ({
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

    let payoutTxn;

    try {
      payoutTxn = await PayoutTransaction.create(
        [
          {
            userId: userId,
            idempotencyKey: requestId,
            serviceType: "XPRESS_PAYOUT",
            referenceId: referenceId,
            bankAccount: bankAccountNumber,
            ifsc: ifsc,
            beneficiaryName: name,
            beneficiaryPhone: phone,
            amount: amount,
            totalDebit: amount,
            status: "INITIATED",
          },
        ],

        { session },
      );
    } catch (err) {
      if (err.code === 11000) {
        // duplicate request → fetch existing txn
        const existing = await PayoutTransaction.findOne({
          idempotencyKey: requestId,
        });

        await session.abortTransaction();
        session.endSession();

        return existing;
      }
      throw err;
    }

    const { openingBalance, closingBalance } = await debitWallet({
      userId: userId,
      amount: amount, //paise
      serviceType: "XPRESS_PAYOUT",
      referenceId: referenceId,
      description: `Xpress Payout for ${purpose}`,
      session: session,
    });

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
          walletType: "main",
          description: `Refund: Xpress Payout Failed`,
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

exports.checkXpressPayoutStatus = async ({
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
