const mongoose = require("mongoose");
const { doRecharge } = require("../client/cspl/apis/doRecharge");

const UserWallet = require("../models/userWallet");
const User = require("../models/userModel");
const Package = require("../models/packageModel");
const Service = require("../models/serviceModel");
const WalletLedger = require("../models/walletLedgerModel");
const {
  generateUniqueRefernceId,
} = require("../utils/generateUniqueReferenceId");
const RechargeReport = require("../models/rechargeReportModel");
const { calculateCommission } = require("../helpers/calculateCommission");
const { calculateTds } = require("../helpers/calculateTds");
const {
  validateUserPackageAndService,
} = require("./common/validateUserPackageAndService");
const { debitWallet } = require("./common/walletService");
const { processCommission } = require("./common/commissionService");
const { processRefund } = require("./common/refundService");
const Transaction = require("../models/transactionModel");

exports.doRechargeService = async ({
  userId,
  operatorId,
  amount, //paise
  operatorCode,
  operatorName,
  number,
  billerMode,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();

    const { packageId, serviceId } = await validateUserPackageAndService({
      userId: userId,
      serviceName: "recharge",
      pipeline: "recharge1",
      operatorId: operatorId,
      amount: amount, //paise
    });

    const { openingBalance, closingBalance } = await debitWallet({
      userId: userId,
      amount: amount, //paise
      serviceType: "RECHARGE",
      serviceCategory: operatorName,
      referenceId: referenceId,
      description: "Mobile Prepaid Recharge",
      session: session,
    });

    await RechargeReport.create(
      [
        {
          userId: userId,
          operatorId: operatorId,
          operatorName: operatorName,
          mobileNumber: number,
          amount: amount, //paise
          referenceId: referenceId,
          status: "INITIATED",
        },
      ],
      { session: session },
    );

    await Transaction.create(
      [
        {
          userId: userId,
          referenceId: referenceId,
          serviceType: "RECHARGE",
          serviceCategory: operatorName,
          amount: amount, //paise
          wallet: "main",
          type: "debit",
          status: "INITIATED",
          meta: {
            request: {
              operatorId: operatorId,
              operatorName: operatorName,
              mobileNumber: number,
            },
          },
        },
      ],
      { session: session },
    );

    await session.commitTransaction();

    let result;

    try {
      result = await doRecharge({
        client_referenceId: referenceId,
        amount,
        operatorCode,
        number,
        billerMode,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error?.response?.data?.message ||
          error?.message ||
          error?.errors ||
          "Something went wrong",
        // data: error?.response?.data || null,
      };
    }

    if (result?.status === "PENDING") {
      console.log("Entered Pending Block");
      const pendingSession = await mongoose.startSession();
      try {
        pendingSession.startTransaction();

        await WalletLedger.updateOne(
          { referenceId: referenceId, serviceType: "RECHARGE" },
          { status: "PENDING" },
          { session: pendingSession },
        );

        await RechargeReport.updateOne(
          { referenceId: referenceId },
          { status: "PENDING" },
          { session: pendingSession },
        );

        await Transaction.updateOne(
          {
            referenceId: referenceId,
          },
          {
            $set: {
              status: "PENDING",
              providerTxnId: result?.txn_ref,
              remark: result ? result?.message : "",
              "meta.response": result,
            },
          },
          { session: pendingSession },
        );

        await pendingSession.commitTransaction();
        return result;
      } catch (error) {
        if (pendingSession.inTransaction()) {
          await pendingSession.abortTransaction();
        }
        throw error;
      } finally {
        pendingSession.endSession();
      }
    } else if (result?.status === "SUCCESS") {
      console.log("Entered Success Block");

      try {
        const { commission, tdsAmount, netCommission } =
          await processCommission({
            userId: userId,
            amount: amount, //paise
            packageId: packageId,
            serviceId: serviceId,
            serviceType: "RECHARGE",
            serviceCategory: operatorName,
            operatorId: operatorId,
            pipeline: "recharge1",
            referenceId: referenceId,
            providerTxnId: result?.txn_ref,
            reportModel: RechargeReport,
            description: "Recharge Commission",
            apiResponse: result,
          });

        return result;
      } catch (error) {
        console.error("Commission failed:", error);
      }
    } else {
      console.log("Entered Failed Block");

      try {
        const { openingBalance, closingBalance } = await processRefund({
          userId: userId,
          amount: amount, //paise
          referenceId: referenceId,
          serviceType: "RECHARGE",
          serviceCategory: operatorName,
          walletType: "main",
          reportModel: RechargeReport,
          description: "Recharge Failed Refund",
          apiResponse: result,
        });

        const err = new Error(result?.message || "Recharge Failed");
        err.statusCode = 400;
        err.data = result;

        throw err;
      } catch (error) {
        throw error;
      }
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
