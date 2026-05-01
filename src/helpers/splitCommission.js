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
  serviceType = null,
  serviceCategory = null,
  operatorId = null,
  categoryId = null,
  pipeline,
  referenceId,
  session,
}) => {
  try {
    console.log("Entered Split Commission ");
    let currentUser = await User.findOne({
      _id: userId,
      isActive: true,
      isDeleted: false,
    }).select("_id parentUserId packageId");

    console.log(currentUser, "currentUser from split");

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
      const uplineUser = await User.findOne({
        _id: currentUser.parentUserId,
        isDeleted: false,
        isActive: true,
      }).select("_id parentUserId packageId");

      console.log(uplineUser, "uplineUser from split");

      if (!uplineUser) {
        currentUser = await User.findById(currentUser.parentUserId).select(
          "_id parentUserId",
        );
        continue;
      }
      //  Calculate upline commission
      const uplineCommission = await calculateCommission({
        amount: amount, //paise
        packageId: uplineUser.packageId,
        serviceId: serviceId,
        operatorId: operatorId,
        categoryId: categoryId,
        pipeline: pipeline,
      });

      console.log(uplineCommission, "uplineCommission from split");

      // Margin calculation
      const margin = uplineCommission - previousCommission;
      console.log(margin, "margin from split");

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
              entryType: "COMMISSION",
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
