const User = require("../models/userModel");
const UserWallet = require("../models/userWallet");
const WalletLedger = require("../models/walletLedgerModel");

const { calculateCommission } = require("./calculateCommission");
const { calculateGst } = require("./calculateGst");
const GstLedger = require("../models/gstLedgerModel");
const TdsLedger = require("../models/tdsLedgerModel");
const { calculateTds } = require("./calculateTds");

exports.applyChargeHierarchy = async ({
  userId, // transaction user
  amount, // paise
  serviceId,
  serviceType = null,
  serviceCategory = null,
  operatorId = null,
  categoryId = null,
  pipeline,
  referenceId,
  session,
}) => {
  try {
    console.log("EnteredApply Charge Hierarchy ");
    let currentUser = await User.findOne({
      _id: userId,
      isActive: true,
      isDeleted: false,
    }).select("_id parentUserId packageId");

    console.log(currentUser, "currentUser from split");

    if (!currentUser) return;

    //  Calculate charges of transaction user
    let previousUserCharge = await calculateCommission({
      amount: amount,
      packageId: currentUser?.packageId,
      serviceId: serviceId,
      operatorId: operatorId,
      categoryId: categoryId,
      pipeline: pipeline,
    });

    //  Traverse ONLY uplines
    while (currentUser.parentUserId) {
      const uplineUser = await User.findOne({
        _id: currentUser.parentUserId,
        isDeleted: false,
        isActive: true,
      }).select("_id parentUserId packageId");

      console.log(uplineUser, "uplineUser from charge hierarchy");

      if (!uplineUser) {
        currentUser = await User.findById(currentUser.parentUserId).select(
          "_id parentUserId",
        );
        continue;
      }
      //  Calculate upline charges
      const uplineUserCharges = await calculateCommission({
        amount: amount, //paise
        packageId: uplineUser.packageId,
        serviceId: serviceId,
        operatorId: operatorId,
        categoryId: categoryId,
        pipeline: pipeline,
      });

      console.log(uplineUserCharges, "uplineUserCharges from charge hierarchy");

      // Margin calculation
      const margin = uplineUserCharges - previousUserCharge;
      console.log(margin, "margin from charge hierarchy");

      // Skip if no earning
      if (margin > 0) {
        const tdsAmount = calculateTds(margin); //because income for upline
        const netAmount = margin - tdsAmount;

        //  Wallet Update
        const wallet = await UserWallet.findOneAndUpdate(
          {
            userId: uplineUser._id,
            isActive: true,
            isDeleted: false,
          },
          { $inc: { mainWallet: netAmount } }, //credit with margin after dedeuct tds
          { new: true, session: session },
        );

        if (!wallet) {
          throw new Error(`Wallet not found for user ${uplineUser._id}`);
        }

        const closingBalance = wallet.mainWallet;
        const openingBalance = closingBalance - netAmount;

        //  Wallet Ledger
        await WalletLedger.create(
          [
            {
              userId: uplineUser._id,
              serviceType: serviceType,
              serviceCategory: serviceCategory,
              entryType: "BONUS", //earn when doenline do trans
              wallet: "main",
              type: "credit",
              amount: netAmount, //credit with margin after dedeuct tds
              referenceId: referenceId,
              openingBalance: openingBalance,
              closingBalance: closingBalance,
              description: "Payout Bonus",
            },
          ],
          { session: session },
        );

        // TDS Ledger
        await TdsLedger.create(
          [
            {
              userId: uplineUser._id,
              referenceId: referenceId,
              commissionAmount: margin,
              tdsRate: 5,
              netCommission: netAmount,
              tdsAmount: tdsAmount,
            },
          ],
          { session: session },
        );

        //  Move upward
        previousUserCharge = uplineUserCharges;
      }

      currentUser = uplineUser;
    }
  } catch (error) {
    throw error;
  }
};
