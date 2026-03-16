const { fetchBbpsBill } = require("../client/cspl/apis/fetchBbpsBill");
const { validateBbpsBill } = require("../client/cspl/apis/validateBbpsBill");
const User = require("../models/userModel");

exports.validateBbpsBillService = async (billerId, paramName, paramValue) => {
  try {
    const result = await validateBbpsBill({
      billerId: billerId,
      paramName: paramName,
      paramValue: paramValue,
    });

    console.log("Bbps bill validate result service", result);

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
