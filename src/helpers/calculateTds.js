exports.calculateTds = (amount) => {
  const tdsPercent = 5;
  if (!amount) {
    return 0;
  }

  const tdsAmount = Number(((amount * tdsPercent) / 100).toFixed(2));
  const netAmount = Number((amount - tdsAmount).toFixed(2));
  console.log(netAmount, "netAmount of commission");

  return tdsAmount;
};
