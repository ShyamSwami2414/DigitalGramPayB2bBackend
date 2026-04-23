const User = require("../models/userModel");
const UserWallet = require("../models/userWallet");
const WalletLedger = require("../models/walletLedgerModel");
const TdsLedger = require("../models/tdsLedgerModel");

const { calculateCommission } = require("./calculateCommission");
const { calculateTds } = require("./calculateTds");

exports.splitCommission = async ({
  userId, // transaction user
  amount, // paise
  serviceId,
  operatorId = null,
  categoryId = null,
  pipeline,
  referenceId,
  session,
}) => {
  try {
    let currentUser = await User.findById(userId).select(
      "_id parentUserId packageId",
    );

    if (!currentUser) return;

    //  Calculate commission of transaction user
    let previousCommission = await calculateCommission({
      amount: amount,
      packageId: currentUser?.packageId,
      serviceId: serviceId,
      operatorId: operatorId,
      categoryId: categoryId,
      pipeline: pipeline,
    });

    //  Traverse ONLY uplines
    while (currentUser.parentUserId) {
      const uplineUser = await User.findById(currentUser.parentUserId).select(
        "_id parentUserId packageId",
      );

      if (!uplineUser) break;

      //  Calculate upline commission
      const uplineCommission = await calculateCommission({
        amount: amount, //paise
        packageId: uplineUser.packageId,
        serviceId: serviceId,
        operatorId: operatorId,
        categoryId: categoryId,
        pipeline: pipeline,
      });

      // Margin calculation
      const margin = uplineCommission - previousCommission;

      // Skip if no earning
      if (margin > 0) {
        const tdsAmount = calculateTds(margin);
        const netAmount = margin - tdsAmount;

        //  Wallet Update
        const wallet = await UserWallet.findOneAndUpdate(
          {
            userId: uplineUser._id,
            isActive: true,
            isDeleted: false,
          },
          { $inc: { mainWallet: netAmount } },
          { new: true, session: session },
        );

        const closingBalance = wallet.mainWallet;
        const openingBalance = closingBalance - netAmount;

        //  Wallet Ledger
        await WalletLedger.create(
          [
            {
              userId: uplineUser._id,
              serviceType: "COMMISSION",
              wallet: "main",
              type: "credit",
              amount: netAmount,
              referenceId: referenceId,
              openingBalance: openingBalance,
              closingBalance: closingBalance,
              description: "Commission from Downline",
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
          { session },
        );

        //  Move upward
        previousCommission = uplineCommission;
      }

      currentUser = uplineUser;
    }
  } catch (error) {
    throw error;
  }
};
