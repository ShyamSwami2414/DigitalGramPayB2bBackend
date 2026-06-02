const rupeeToPaise = (rupees) => {
  console.log("rupees", rupees);

  if (rupees == null) {
    throw new Error("Invalid amount");
  }

  const normalizedAmount = String(rupees).replace(/,/g, "").trim();

  if (isNaN(normalizedAmount)) {
    throw new Error(`Invalid amount: ${rupees}`);
  }

  return Math.round(Number(normalizedAmount) * 100);
};

const paiseToRupee = (paise) => {
  if (paise == null || paise === "" || isNaN(paise)) {
    console.warn("Invalid paise value:", paise);
    return 0;
  }

  return Number((Number(paise) / 100).toFixed(2));
};

const formatRupee = (value) => {
  const num = Number(value);

  if (isNaN(num)) {
    throw new Error("Invalid number");
  }

  return num.toFixed(2);
};

module.exports = { paiseToRupee, rupeeToPaise, formatRupee };
