exports.calculateTds = (amount) => {
  //in paise tds
  const tdsPercent = 2;
  if (!amount) {
    return 0;
  }

  const tdsAmount = Math.round((amount * tdsPercent) / 100);
  const netAmount = amount - tdsAmount;
  console.log(netAmount, "netAmount of commission");

  return tdsAmount;
};
