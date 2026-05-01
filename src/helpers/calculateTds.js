exports.calculateTds = (amount) => {
  //in paise tds
  if (!amount) {
    return 0;
  }

  const tdsPercent = 5;
  const tdsAmount = Math.round((amount * tdsPercent) / 100);
  const netAmount = amount - tdsAmount;
  console.log(netAmount, "netAmount of commission");

  return tdsAmount;
};
