exports.calculateGst = (amount) => {
  //in paise tds
  if (!amount) {
    return 0;
  }

  const gstPercent = 18;
  const gstAmount = Math.round((amount * gstPercent) / 100);
  const totalCharges = amount + gstAmount;
  console.log(totalCharges, "totalCharges");

  return gstAmount;
};
