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
const {
  validateUserPackageAndService,
} = require("./common/validateUserPackageAndService");
const Transaction = require("../models/transactionModel");
const WalletLedger = require("../models/walletLedgerModel");
const { processCharges } = require("./common/chargeService");
const { applyChargeHierarchy } = require("../helpers/applyChargeHierarchy");

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

    const { packageId, serviceId } = await validateUserPackageAndService({
      userId: userId,
      serviceName: "xpress-payout",
      pipeline: "xpress-payout1",
      amount: amount, //paise
    });

    //for main amount
    const { openingBalance, closingBalance } = await debitWallet({
      userId: userId,
      amount: amount, //paise
      serviceType: "XPRESS_PAYOUT",
      referenceId: referenceId,
      description: `Xpress Payout for ${purpose}`,
      session: session,
    });

    const { charges, gstAmount, totalCharges } = await processCharges({
      userId: userId,
      amount: amount, //paise
      packageId: packageId,
      serviceId: serviceId,
      serviceType: "XPRESS_PAYOUT",
      walletType: "main",

      pipeline: "xpress-payout1",
      referenceId: referenceId,
      reportModel: PayoutTransaction,
      description: "Xpress Payout Charges",

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
          serviceType: "XPRESS_PAYOUT",
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
        amount: amount, //paise
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
      console.log("Entered Success/Pending Block");

      const successSesion = await mongoose.startSession();

      try {
        successSesion.startTransaction();
        await WalletLedger.updateOne(
          { referenceId: referenceId, serviceType: "XPRESS_PAYOUT" },
          { $set: { status: result?.data?.status } },
          { session: successSesion },
        );

        await PayoutTransaction.updateOne(
          { referenceId: referenceId, serviceType: "XPRESS_PAYOUT" },
          { $set: { status: result?.data?.status } },
          { session: successSesion },
        );

        await Transaction.updateOne(
          {
            referenceId: referenceId,
          },
          {
            $set: {
              status: result?.data?.status,
              providerTxnId: result?.txn_ref,
              remark: result ? result?.message : "",
              "meta.response": result,
            },
          },
          { session: successSesion },
        );

        await applyChargeHierarchy({
          userId: userId,
          amount: amount, //paise
          serviceId: serviceId,
          serviceType: "XPRESS_PAYOUT",
          pipeline: "xpress-payout1",
          referenceId: referenceId,
          session: successSesion,
        });

        await successSesion.commitTransaction();

        return result;
      } catch (error) {
        if (successSesion.inTransaction()) {
          await successSesion.abortTransaction();
          console.error("Charges Processing failed:", error);
        }
      } finally {
        successSesion.endSession();
      }
    } else if (result?.status === "FAILED") {
      const refundSession = await mongoose.startSession();
      try {
        const amountInPaiseWithChargeGst = amount + totalCharges;
        refundSession.startTransaction();

        await processRefund({
          userId: userId,
          amount: amountInPaiseWithChargeGst, //paise amount including charge with gst
          referenceId: referenceId,
          serviceType: "XPRESS_PAYOUT",

          walletType: "main",
          // reportModel = PayoutTransaction,
          description: `Complete Refund With Charges: Xpress Payout Failed`,
          apiResponse: result,
          session: refundSession,
        });

        await PayoutTransaction.findOneAndUpdate(
          { referenceId },
          { $set: { status: "REVERSED" } },
          { session: refundSession },
        );

        await Transaction.updateOne(
          { referenceId: referenceId },
          {
            $set: {
              status: "FAILED",
              isRefunded: true,
              remark: result ? result?.message : "",
              "meta.response": result,
            },
          },
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
