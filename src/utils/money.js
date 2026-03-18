const paiseToRupee = (paise) => {
  return (paise / 100).toFixed(2);
};

const rupeeToPaise = (rupees) => {
  return Math.round(Number(rupees) * 100);
};

const formatRupee = (value) => {
  const num = Number(value);

  if (isNaN(num)) {
    throw new Error("Invalid number");
  }

  return num.toFixed(2);
};

module.exports = { paiseToRupee, rupeeToPaise, formatRupee };
