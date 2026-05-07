const { fetchPlans } = require("../client/cspl/apis/fetchPlans");
const { mobileVerify } = require("../client/cspl/apis/mobileVerify");
const { getOperatorCode } = require("../helpers/getOperatorCode");
const States = require("../models/statesModel");

exports.rechargeMobileVerify = async (mobileNumber, referenceId) => {
  try {
    //calling verify api

    const firstResult = await mobileVerify({
      mobile: mobileNumber,
      client_referenceId: referenceId,
    });

    console.log(firstResult, "firstResult");

    if (firstResult.status === "FAILED" || firstResult.status === "ERROR") {
      throw firstResult;
    }

    const circleCode = firstResult?.data?.circle;

    // find state from DB
    const state = await States.findOne({
      circleCode: circleCode,
      isActive: true,
    }).select("circleCode circleName");

    if (!state) {
      throw new Error("State Not Found");
    }

    const operatorCode = await getOperatorCode(firstResult?.data?.operator);

    //calling plan fetch api
    const secondResult = await fetchPlans(operatorCode, state.circleName);

    if (secondResult.status === "FAILED") {
      throw secondResult;
    }

    return {
      ...firstResult.data,
      state: state ? state.circleName : null,
      operatorCode: operatorCode ? operatorCode : null,
      plans: secondResult?.data?.data?.plans || [],
    };
  } catch (error) {
    throw error;
  }
};
