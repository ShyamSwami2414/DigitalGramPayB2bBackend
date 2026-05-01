const UserWallet = require("../../models/userWallet");
const WalletLedger = require("../../models/walletLedgerModel");

const debitAepsWallet = async ({
  userId,
  amount, //paise
  serviceType = null,
  serviceCategory = null,
  referenceId,
  description,
  session,
}) => {
  let openingBalance = 0;
  let closingBalance = 0;

  console.log(amount, "aeps debit wallet amount value");

  const wallet = await UserWallet.findOneAndUpdate(
    {
      userId,
      isActive: true,
      isDeleted: false,
      $expr: {
        $gte: [{ $subtract: ["$aepsWallet", "$aepsHoldAmount"] }, amount],
      },
    },
    {
      $inc: {
        aepsWallet: -amount,
      },
    },
    {
      new: true,
      session,
    },
  );

  console.log("wallet from db", wallet);

  if (!wallet) {
    throw new Error("Insufficient Aeps Wallet Balance Contact to Admin");
  }

  closingBalance = wallet.aepsWallet;
  openingBalance = closingBalance + amount;

  await WalletLedger.create(
    [
      {
        userId,
        serviceType: serviceType,
        serviceCategory: serviceCategory,
        wallet: "aeps",
        type: "debit",
        amount: amount,
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

const debitWallet = async ({
  userId,
  amount, //paise
  serviceType = null,
  serviceCategory = null,
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

  console.log("wallet from db", wallet);

  if (!wallet) {
    throw new Error("Insufficient Wallet Balance, Contact to Admin");
  }

  closingBalance = wallet.mainWallet;
  openingBalance = closingBalance + amount;

  await WalletLedger.create(
    [
      {
        userId: userId,
        serviceType: serviceType,
        serviceCategory: serviceCategory, //dynamic like operator for recharge, aeps withdraw service types, bbps categories etc
        wallet: "main",
        type: "debit",
        amount: amount,
        openingBalance: openingBalance,
        closingBalance: closingBalance,
        referenceId: referenceId,
        description: description,
        status: "INITIATED",
      },
    ],
    { session: session },
  );

  return { openingBalance, closingBalance };
};

const creditWallet = async ({
  userId,
  amount, // paise
  walletType,
  serviceType = null,
  serviceCategory = null,
  referenceId,
  description,
  session,
}) => {
  let openingBalance = 0;
  let closingBalance = 0;

  console.log(amount, "credit wallet amount value");

  const fieldName =
    walletType && walletType.toLowerCase() === "aeps"
      ? "aepsWallet"
      : "mainWallet";

  const wallet = await UserWallet.findOneAndUpdate(
    {
      userId,
      isActive: true,
      isDeleted: false,
    },
    {
      $inc: {
        [fieldName]: amount,
      },
    },
    {
      new: true,
      session,
    },
  );

  console.log("wallet from db after credit", wallet);

  if (!wallet) {
    throw new Error("Wallet not found or account is inactive");
  }

  closingBalance = wallet[fieldName];
  openingBalance = closingBalance - amount;

  await WalletLedger.create(
    [
      {
        userId,
        serviceType: serviceType,
        serviceCategory: serviceCategory,
        wallet: walletType,
        type: "credit", // Type is credit
        amount: amount,
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
  creditWallet,
  debitAepsWallet,
};
