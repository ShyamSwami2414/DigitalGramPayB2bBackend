const UserWallet = require("../../models/userWallet");
const WalletLedger = require("../../models/walletLedgerModel");

const debitWallet = async ({
  userId,
  amount, //paise
  amountInRupee = null, //rupee
  serviceType,
  referenceId,
  description,
  session,
}) => {
  let openingBalance = 0;
  let closingBalance = 0;

  console.log(amount, "debit wallet amount value");

  const wallet = await UserWallet.findOneAndUpdate(
    {
      userId,
      isActive: true,
      isDeleted: false,
      $expr: {
        // convert wallet balance and hold to paise for atomic comparison
        $gte: [
          {
            $subtract: [
              { $multiply: ["$mainWallet", 100] }, // rupees → paise
              { $multiply: ["$mainHoldAmount", 100] }, // rupees → paise
            ],
          },
          amount,
        ],
      },
    },
    {
      // decrement in rupees (atomic)
      $inc: {
        mainWallet: -(amount / 100),
      },
    },
    {
      new: true,
      session,
    },
  );

  console.log("wallet from db", wallet);

  if (!wallet) {
    throw new Error("Insufficient Wallet Balance Contact Admin");
  }

  closingBalance = wallet.mainWallet;

  if (serviceType === "BBPS") {
    openingBalance = closingBalance + amountInRupee;
  } else {
    openingBalance = closingBalance + amount;
  }

  await WalletLedger.create(
    [
      {
        userId,
        serviceType,
        wallet: "main",
        type: "debit",
        amount: serviceType === "BBPS" ? amountInRupee : amount,
        openingBalance,
        closingBalance,
        referenceId,
        description,
      },
    ],
    { session },
  );

  return { openingBalance, closingBalance };
};

module.exports = {
  debitWallet,
};
