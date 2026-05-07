const {
  fetchBbpsBillerInfo,
} = require("../client/cspl/apis/fetchBbpsBillerInfo");
const BbpsBillers = require("../models/bbpsBillersModel");

exports.fetchBbpsBillerInfoService = async (billerId) => {
  try {
    const isValidBiller = await BbpsBillers.findOne({
      billerId: billerId,
      isActive: true,
      isDeleted: false,
    }).select("billerId");

    if (!isValidBiller) {
      throw Error("Biller Not Found");
    }

    const result = await fetchBbpsBillerInfo({
      billerId: isValidBiller.billerId,
    });

    console.log(
      "bbps biller info result service",
      JSON.stringify(result, null, 2),
    );

    if (result?.status === "FAILED" || result?.status === "ERROR") {
      throw result;
    }

    if (result?.data?.responseCode === "000") {
      return result.data;
    } else {
      const errorMessage =
        result?.data?.errorInfo?.error?.errorMessage || "BBPS API Error";
      throw new Error(errorMessage);
    }
  } catch (error) {
    throw error;
  }
};
