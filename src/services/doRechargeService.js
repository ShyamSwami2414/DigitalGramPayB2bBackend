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
const { debitWallet, debitP2PWallet } = require("./common/walletService");
const { processCommission } = require("./common/commissionService");
const { processRefund } = require("./common/refundService");
const Transaction = require("../models/transactionModel");
const walletLedgerModel = require("../models/walletLedgerModel");
const { splitCommission } = require("../helpers/splitCommission");
const tdsLedgerModel = require("../models/tdsLedgerModel");

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

    const commission = await calculateCommission({
      amount: amount, //paise
      packageId: packageId,
      serviceId: serviceId,
      operatorId: operatorId,
      pipeline: "recharge1",
    });

    console.log("commission paise", commission);

    const tdsAmount = calculateTds(commission); //paise
    const netCommission = commission - tdsAmount; //payable to user

    const amountAfterCommission = amount - netCommission;

    const { openingBalance, closingBalance } = await debitP2PWallet({
      userId: userId,
      amount: amount, // recharge amount paise
      p2pAmount: amountAfterCommission, // amount paise
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
          p2pAmount: amountAfterCommission, //paise
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
          amount: amountAfterCommission, //paise
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
          { $set: { status: "PENDING" } },
          { session: pendingSession },
        );

        await RechargeReport.updateOne(
          { referenceId: referenceId },
          { $set: { status: "PENDING", description: result?.message } },
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
      const successSession = await mongoose.startSession();

      try {
        successSession.startTransaction();
        await walletLedgerModel.updateOne(
          { referenceId: referenceId, serviceType: "RECHARGE" },
          { status: "SUCCESS" },
          { session: successSession },
        );

        await RechargeReport.updateOne(
          { referenceId: referenceId },
          {
            status: "SUCCESS",
            commission: commission,
            tds: tdsAmount,
            netCommission: netCommission,
            providerTxnId: referenceId,
            description: result?.message,
          },
          { session: successSession },
        );

        await tdsLedgerModel.create(
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
          { session: successSession },
        );

        await Transaction.updateOne(
          {
            referenceId: referenceId,
          },
          {
            $set: {
              status: "SUCCESS",
              providerTxnId: result?.txn_ref,
              remark: result ? result?.message : "",
              "meta.response": result ? result : "",
            },
          },
          { session: successSession },
        );

        await splitCommission({
          userId: userId,
          amount: amount, //paise
          serviceId: serviceId,
          serviceType: "RECHARGE",
          walletType: "main",
          serviceCategory: operatorName,
          operatorId: operatorId,
          categoryId: null,
          pipeline: "recharge1",
          referenceId: referenceId,
          session: successSession,
        });

        await successSession.commitTransaction();

        return result;
      } catch (error) {
        console.error("Commission failed:", error);
        if (successSession.inTransaction()) {
          await successSession.abortTransaction();
        }
        throw error;
      } finally {
        successSession.endSession();
      }
    } else {
      console.log("Entered Failed Block");

      try {
        const { openingBalance, closingBalance } = await processRefund({
          userId: userId,
          amount: amountAfterCommission, //paise
          referenceId: referenceId,
          serviceType: "RECHARGE",
          serviceCategory: operatorName,
          walletType: "main",
          reportModel: RechargeReport,
          description: "Recharge Failed Refund",
          apiMessage: result?.message,
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
