const { doRecharge } = require("../client/cspl/apis/doRecharge");
const { getOperatorCode } = require("../helpers/getOperatorCode");

exports.doRecharge = async (amount, operatorCode, number, billerMode) => {
  try {
    //calling plan fetch api
    const result = await doRecharge(amount, operatorCode, number, billerMode);

    if (result.status !== "success") {
      throw new Error("Recharge Failed");
    }

    return result;
  } catch (error) {
    throw error;
  }
};
