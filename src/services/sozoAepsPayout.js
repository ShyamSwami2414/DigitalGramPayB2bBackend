const {
  aepsPayout,
} = require("../client/sozoWallet/apis/payout/aeronpay/aepsPayout");
const {
  aepsPayoutStatus,
} = require("../client/sozoWallet/apis/payout/aeronpay/checkPayoutStatus");
const {
  generateUniqueRefernceId,
} = require("../utils/generateUniqueReferenceId");
const { paiseToRupee } = require("../utils/money");
const { debitAepsWallet } = require("./common/walletService");
const mongoose = require("mongoose");

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

    const { openingBalance, closingBalance } = await debitAepsWallet({
      userId: userId,
      amount: amount, //paise
      serviceType: "AEPS_PAYOUT",
      referenceId: referenceId,
      description: `Aeps Payout for ${purpose}`,
      session: session,
    });

    await session.commitTransaction();

    let result;

    try {
      result = await aepsPayout({
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

    if (result?.success === false || result?.status === "FAILED") {
      const refundSession = await mongoose.startSession();
      try {
        refundSession.startTransaction();

        await processRefund({
          userId: userId,
          amount: amount, //paise
          referenceId: referenceId,
          description: `Refund: AepsPayout Failed`,
          session: refundSession,
        });

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
    }

    console.log(result, "result");
    return result;
  } catch (error) {
    throw error;
  }
};

exports.checkAepsPayoutStatus = async ({
  userId,
  requestId,
  transactionId,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const referenceId = generateUniqueRefernceId(); //backend unique

    await session.commitTransaction();

    let result;

    try {
      result = await aepsPayoutStatus({
        client_referenceId: referenceId,
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

    console.log("Success", result?.success || result?.status);

    if (result?.success === false || result?.status === "FAILED") {
      const refundSession = await mongoose.startSession();

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
