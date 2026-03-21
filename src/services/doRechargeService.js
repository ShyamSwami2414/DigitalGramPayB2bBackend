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
      operatorId: operatorId,
      amount: amount, //paise
    });

    const { openingBalance, closingBalance } = await debitWallet({
      userId: userId,
      amount: amount,
      serviceType: "RECHARGE",
      referenceId: referenceId,
      description: "Mobile Prepaid Recharge",
      session: session,
    });

    // const wallet = await UserWallet.findOneAndUpdate(
    //   {
    //     userId: userId,
    //     isActive: true,
    //     isDeleted: false,
    //     $expr: {
    //       $gte: [{ $subtract: ["$mainWallet", "$mainHoldAmount"] }, amount],
    //     },
    //   },
    //   {
    //     $inc: {
    //       mainWallet: -amount,
    //     },
    //   },
    //   {
    //     new: true,
    //     session,
    //   },
    // );

    // if (!wallet) {
    //   throw new Error("Insufficient Wallet Balance");
    // }

    // closingBalance = wallet.mainWallet;
    // openingBalance = closingBalance + amount;

    // await WalletLedger.create(
    //   [
    //     {
    //       userId: userId,
    //       serviceType: "RECHARGE",
    //       wallet: "main",
    //       type: "debit",
    //       amount: amount,
    //       openingBalance: openingBalance,
    //       closingBalance: closingBalance,
    //       referenceId: referenceId,
    //       description: "Mobile Prepaid Recharge",
    //     },
    //   ],
    //   { session },
    // );

    await RechargeReport.create(
      [
        {
          userId: userId,
          operatorId: operatorId,
          operatorName: operatorName,
          mobileNumber: number,
          amount: amount,
          referenceId: referenceId,
        },
      ],
      { session },
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
      result = { status: "FAILED" };
    }

    if (result.status === "PENDING") {
      await RechargeReport.updateOne({ referenceId }, { status: "PENDING" });
    }

    if (result.status === "SUCCESS") {
      // let openingBalance = 0;
      // let closingBalance = 0;

      // const commissionSession = await mongoose.startSession();
      // commissionSession.startTransaction();

      try {
        const { commission, tdsAmount, netCommission } =
          await processCommission({
            userId: userId,
            amount: amount, //paise
            packageId: packageId,
            serviceId: serviceId,
            operatorId: operatorId,
            referenceId: referenceId,
            providerTxnId: result?.txn_ref,
            reportModel: RechargeReport,
            description: "Recharge Commission",
          });
        // const commission = await calculateCommission({
        //   amount,
        //   packageId: user.packageId,
        //   serviceId: rechargeService._id,
        //   operatorId: operatorId,
        // });
        // const tdsAmount = calculateTds(commission);
        // const netCommission = commission - tdsAmount;
        // console.log(commission, "calculatedCommission");
        // const wallet = await UserWallet.findOneAndUpdate(
        //   { userId, isActive: true, isDeleted: false },
        //   { $inc: { mainWallet: netCommission } },
        //   { new: true, session: commissionSession },
        // );
        // closingBalance = wallet.mainWallet;
        // openingBalance = closingBalance - netCommission;
        // await WalletLedger.create(
        //   [
        //     {
        //       userId,
        //       serviceType: "COMMISSION",
        //       wallet: "main",
        //       type: "credit",
        //       amount: netCommission,
        //       referenceId: referenceId,
        //       openingBalance: openingBalance,
        //       closingBalance: closingBalance,
        //       description: "Recharge Commission",
        //     },
        //   ],
        //   { session: commissionSession },
        // );
        // await RechargeReport.updateOne(
        //   { referenceId },
        //   {
        //     status: "SUCCESS",
        //     commission: commission,
        //     tds: tdsAmount,
        //     netCommission: netCommission,
        //   },
        //   { session: commissionSession },
        // );
        // await commissionSession.commitTransaction();
      } catch (error) {
        // if (commissionSession.inTransaction()) {
        //   await commissionSession.abortTransaction();
        // }

        throw error;
      }
    }

    if (result.status === "FAILED") {
      // let openingBalance = 0;
      // let closingBalance = 0;

      // const refundSession = await mongoose.startSession();
      // refundSession.startTransaction();

      try {
        const { openingBalance, closingBalance } = await processRefund({
          userId: userId,
          amount: amount, //paise
          referenceId: referenceId,
          reportModel: RechargeReport,
          description: "Recharge Failed Refund",
        });

        // const wallet = await UserWallet.findOneAndUpdate(
        //   { userId, isActive: true, isDeleted: false },
        //   { $inc: { mainWallet: amount } },
        //   { new: true, session: refundSession },
        // );
        // closingBalance = wallet.mainWallet;
        // openingBalance = closingBalance - amount;
        // await WalletLedger.create(
        //   [
        //     {
        //       userId,
        //       serviceType: "REFUND",
        //       wallet: "main",
        //       type: "credit",
        //       amount,
        //       referenceId,
        //       openingBalance: openingBalance,
        //       closingBalance: closingBalance,
        //       description: "Recharge Failed Refund",
        //     },
        //   ],
        //   { session: refundSession },
        // );
        // await RechargeReport.updateOne(
        //   { referenceId },
        //   { status: "FAILED" },
        //   { new: true, session: refundSession },
        // );
        // await refundSession.commitTransaction();
      } catch (error) {
        // if (refundSession.inTransaction()) {
        //   await refundSession.abortTransaction();
        // }
        // throw error;
      }
    }

    return result;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    throw error;
  } finally {
    session.endSession();
  }
};
