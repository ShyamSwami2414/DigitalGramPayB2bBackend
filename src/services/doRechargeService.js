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

exports.doRechargeService = async (
  userId,
  operatorId,
  amount,
  operatorCode,
  number,
  billerMode,
) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    //calling plan fetch api

    let openingBalance = 0;
    let closingBalance = 0;

    const referenceId = generateUniqueRefernceId();

    const user = await User.findOne({
      _id: userId,
      isActive: true,
      isDeleted: false,
    }).select("packageId assignedServices");

    if (!user?.packageId) {
      throw new Error("No Package Assigned");
    }

    if (user?.assignedServices?.length === 0) {
      throw new Error("No Service Assigned to user");
    }

    console.log("assignedPackage", user?.packageId);
    console.log("assignedServices", user?.assignedServices);

    const isPackageExist = await Package.findOne({
      _id: user?.packageId,
      isActive: true,
      isDeleted: false,
    });

    if (!isPackageExist) {
      throw new Error("Package Not Exist");
    }

    const rechargeService = await Service.findOne({
      name: "recharge",
      isActive: true,
      isDeleted: false,
    });

    if (!rechargeService) {
      throw new Error(" Recharge Service Not Exist");
    }

    if (
      !user.assignedServices.some(
        (serviceId) => serviceId.toString() === rechargeService._id.toString(),
      )
    ) {
      throw new Error("Recharge Service Not Assigned");
    }

    const wallet = await UserWallet.findOneAndUpdate(
      {
        userId: userId,
        isActive: true,
        isDeleted: false,
        $expr: {
          $gte: [{ $subtract: ["$mainWallet", "$mainHoldAmount"] }, amount],
        },
      },
      {
        $inc: {
          mainWallet: -amount,
        },
      },
      {
        new: true,
        session,
      },
    );

    if (!wallet) {
      throw new Error("Insufficient Wallet Balance");
    }

    closingBalance = wallet.mainWallet;
    openingBalance = closingBalance + amount;

    await WalletLedger.create(
      [
        {
          userId: userId,
          serviceType: "RECHARGE",
          wallet: "main",
          type: "debit",
          amount: amount,
          openingBalance: openingBalance,
          closingBalance: closingBalance,
          referenceId: referenceId,
          description: "Mobile Prepaid Recharge",
        },
      ],
      { session },
    );

    await RechargeReport.create(
      [
        {
          userId: userId,
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
      let openingBalance = 0;
      let closingBalance = 0;

      const commissionSession = await mongoose.startSession();
      commissionSession.startTransaction();

      try {
        const commission = await calculateCommission({
          amount,
          packageId: user.packageId,
          serviceId: rechargeService._id,
          operatorId: operatorId,
        });

        const tdsAmount = calculateTds(commission);
        const netCommission = commission - tdsAmount;

        console.log(commission, "calculatedCommission");

        const wallet = await UserWallet.findOneAndUpdate(
          { userId, isActive: true, isDeleted: false },
          { $inc: { mainWallet: netCommission } },
          { new: true, session: commissionSession },
        );

        closingBalance = wallet.mainWallet;
        openingBalance = closingBalance - netCommission;

        await WalletLedger.create(
          [
            {
              userId,
              serviceType: "COMMISSION",
              wallet: "main",
              type: "credit",
              amount: netCommission,
              referenceId: referenceId,
              openingBalance: openingBalance,
              closingBalance: closingBalance,
              description: "Recharge Commission",
            },
          ],
          { session: commissionSession },
        );

        await RechargeReport.updateOne(
          { referenceId },
          {
            status: "SUCCESS",
            commission: commission,
            tds: tdsAmount,
            netCommission: netCommission,
          },
          { session: commissionSession },
        );

        await commissionSession.commitTransaction();
      } catch (error) {
        if (commissionSession.inTransaction()) {
          await commissionSession.abortTransaction();
        }

        throw error;
      } finally {
        commissionSession.endSession();
      }
    }

    if (result.status === "FAILED") {
      let openingBalance = 0;
      let closingBalance = 0;

      const refundSession = await mongoose.startSession();
      refundSession.startTransaction();

      try {
        const wallet = await UserWallet.findOneAndUpdate(
          { userId, isActive: true, isDeleted: false },
          { $inc: { mainWallet: amount } },
          { new: true, session: refundSession },
        );

        closingBalance = wallet.mainWallet;
        openingBalance = closingBalance - amount;

        await WalletLedger.create(
          [
            {
              userId,
              serviceType: "REFUND",
              wallet: "main",
              type: "credit",
              amount,
              referenceId,
              openingBalance: openingBalance,
              closingBalance: closingBalance,
              description: "Recharge Failed Refund",
            },
          ],
          { session: refundSession },
        );

        await RechargeReport.updateOne(
          { referenceId },
          { status: "FAILED" },
          { new: true, session: refundSession },
        );

        await refundSession.commitTransaction();
      } catch (error) {
        if (refundSession.inTransaction()) {
          await refundSession.abortTransaction();
        }

        throw error;
      } finally {
        refundSession.endSession();
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
