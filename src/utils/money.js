const rupeeToPaise = (rupees) => {
  if (rupees == null || isNaN(rupees)) {
    throw new Error("Invalid amount");
  }
  return Math.round(Number(rupees) * 100);
};

const paiseToRupee = (paise) => {
  if (paise == null || isNaN(paise)) {
    throw new Error("Invalid amount");
  }

  return Number((Number(paise) / 100).toFixed(2)); // return NUMBER instead of string
};

const formatRupee = (value) => {
  const num = Number(value);

  if (isNaN(num)) {
    throw new Error("Invalid number");
  }

  return num.toFixed(2);
};

module.exports = { paiseToRupee, rupeeToPaise, formatRupee };
