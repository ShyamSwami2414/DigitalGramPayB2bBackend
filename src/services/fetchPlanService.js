const { fetchPlans } = require("../client/cspl/apis/fetchPlans");
const { getOperatorCode } = require("../helpers/getOperatorCode");

exports.fetchPlan = async (operatorCode, circleName) => {
  try {
    //calling plan fetch api
    const result = await fetchPlans(operatorCode, circleName);

    if (result.status !== "success") {
      throw new Error("Plan Fetch Failed");
    }

    return {
      operatorCode: operatorCode ? operatorCode : null,
      plans: result?.data?.data?.plans || [],
    };
  } catch (error) {
    throw error;
  }
};
