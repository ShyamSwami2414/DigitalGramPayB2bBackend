const { fetchBbpsBill } = require("../client/cspl/apis/fetchBbpsBill");
const { payBbpsBill } = require("../client/cspl/apis/payBbpsBill");
const User = require("../models/userModel");

exports.payBbpsBillService = async (
  refId,
  billerId,
  customerName,
  customerMobile,
  dueDate,
  billamount,
  billDate,
  billPeriod,
  billNumber,
  placeholderValue,
  paramValue,
) => {
  try {
    const result = await payBbpsBill({
      requestId: refId,
      billerId,
      customerName,
      customerMobile,
      dueDate,
      billamount,
      billDate,
      billPeriod,
      billNumber,
      placeholderValue,
      paramValue,
    });

    console.log("Bbps bill result service", result);

    if (result?.status === "FAILED" || result?.status === "ERROR") {
      throw result;
    }

    if (result?.data?.responseCode) {
      return result;
    } else {
      const errorMessage = result?.data?.errorInfo?.error?.errorMessage;

      throw new Error(errorMessage);
    }
  } catch (error) {
    throw error;
  }
};
