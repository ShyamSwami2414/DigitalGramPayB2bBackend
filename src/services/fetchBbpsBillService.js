const { fetchBbpsBill } = require("../client/cspl/apis/fetchBbpsBill");
const User = require("../models/userModel");

exports.fetchBbpsBillService = async (userId, billerId, inputParams) => {
  try {
    console.log(userId);
    const user = await User.findOne({
      _id: userId,
      isActive: true,
      isDeleted: false,
    }).select("email phone");

    console.log(user, "user");

    if (!user) {
      throw Error("User Not Found");
    }

    const result = await fetchBbpsBill({
      billerId: billerId,
      customerMobile: user?.phone,
      customerEmail: user?.email,
      inputParams: inputParams,
    });

    console.log(
      "Bbps bill fetch result service:",
      JSON.stringify(result, null, 2),
    );

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
