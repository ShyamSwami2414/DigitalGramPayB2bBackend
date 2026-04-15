const mongoose = require("mongoose");
const Merchant = require("../models/instantAepsOutletModel");
const User = require("../models/userModel");
const DailyAepsLogin = require("../models/dailyAepsLoginModel");
const {
  generateUniqueRefernceId,
} = require("../utils/generateUniqueReferenceId");

const { debitWallet, creditWallet } = require("./common/walletService");
const { processRefund } = require("./common/refundService");
const { rupeeToPaise, paiseToRupee } = require("../utils/money");
const {
  outletRegister,
} = require("../client/cspl/apis/aeps/instant/outletRegister");

const {
  biometricKycStatus,
} = require("../client/cspl/apis/aeps/instant/biometricKycStatus");

const {
  biometricKyc,
} = require("../client/cspl/apis/aeps/instant/biometricKyc");

const { encryptAadhaar } = require("../helpers/encryptDecryptAadhar");
const {
  dailyLogin,
} = require("../client/cspl/apis/aeps/instant/dailyAepsLogin");
const {
  balanceEnquiry,
} = require("../client/cspl/apis/aeps/instant/balanceEnquiry");
const {
  miniStatement,
} = require("../client/cspl/apis/aeps/instant/miniStatement");
const {
  cashWithdraw,
} = require("../client/cspl/apis/aeps/instant/cashWithdrawal");

exports.instantAepsOutletRegister = async ({
  userId,
  requestId,
  name,
  email,
  mobile,
  aadhaar,
  longitude,
  latitude,
  pan,
  dateOfBirth,
  gender,
  address,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();
    const registrationCharges = 1000;
    const encryptedAadhaar = encryptAadhaar(aadhaar);

    const { openingBalance, closingBalance } = await debitWallet({
      userId: userId,
      amount: registrationCharges, //paise
      serviceType: "AEPS",
      referenceId: referenceId,
      description: "Aeps Outlet Registration Charges",
      session: session,
    });

    await session.commitTransaction();

    let result;

    try {
      result = await outletRegister({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        name,
        email,
        mobile,
        aadhaar: encryptedAadhaar,
        longitude,
        latitude,
        pan,
        dateOfBirth,
        gender,
        address,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log(
      "aeps outlet registration service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.status_code || result?.status);

    if (result?.status === "FAILED" || result?.status_code === "ERR") {
      console.log("Entered");
      const { openingBalance, closingBalance } = await processRefund({
        userId: userId,
        amount: registrationCharges, //paise
        referenceId: referenceId,
        description: "Outlet Register Failed, Charges Refunded",
        apiResponse: result,
      });
    }

    if (
      result?.status === "FAILED" ||
      result?.status === "ERROR" ||
      result?.status_code !== "TXN"
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    throw error;
  }
};

exports.checkBiometricKycStatus = async ({ userId, requestId }) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();
    const spKey = "WAP";

    const merchantExist = await Merchant.findOne({ userId: userId })
      .select("_id outletId")
      .lean()
      .session(session);

    if (!merchantExist) {
      const err = new Error("Merchant not registered, first register yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(merchantExist, "merchantExist");

    await session.commitTransaction();

    let result;

    try {
      result = await biometricKycStatus({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        spKey: spKey,
        mcode: merchantExist?.outletId,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log(
      "aepsbiometric status service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.status_code || result?.status);

    if (result?.status_code === "TXN" || result?.statuscode === "TXN") {
      const successSession = await mongoose.startSession();
      try {
        successSession.startTransaction();
        const data = result?.data?.data;
        console.log(data, "data");
        console.log(data.status, "status");
        console.log(data.action, "action");

        const isKycStatusApproved =
          data?.status === "APPROVED" && data?.action === "NO-ACTION-REQUIRED";

        console.log(isKycStatusApproved, "isKycStatusApproved");

        const merchantUpdate = await Merchant.findOneAndUpdate(
          { userId: new mongoose.Types.ObjectId(userId) },
          {
            $set: {
              status: data?.status,
              action: data?.action,
              temp_ref: data?.referenceKey,
              isAepsEnabled: isKycStatusApproved ? true : false,
            },
          },
          { new: true, runValidators: true, session: successSession },
        );

        if (!merchantUpdate) {
          const err = new Error("Merchant not exist");
          err.statusCode = 404;

          throw err;
        }

        const userUpdate = await User.findOneAndUpdate(
          { _id: new mongoose.Types.ObjectId(userId) },
          {
            $set: {
              isAepsEnabled: isKycStatusApproved ? true : false,
            },
          },
          { new: true, runValidators: true, session: successSession },
        );

        if (!userUpdate) {
          const err = new Error("User not exist");
          err.statusCode = 404;

          throw err;
        }

        await successSession.commitTransaction();
      } catch (error) {
        console.log(error, "check biometric sttau updation error in session");

        if (successSession.inTransaction()) {
          await successSession.abortTransaction();
        }
      } finally {
        successSession.endSession();
      }
    } else if (
      result?.status === "FAILED" ||
      result?.status_code === "ERR" ||
      result?.status === "ERROR" ||
      result?.status_code !== "TXN"
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    throw error;
  }
};

exports.biometricKyc = async ({
  userId,
  requestId,
  latitude,
  longitude,
  captureType,
  biometricData,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId(); //backend unique

    const merchantExist = await Merchant.findOne({ userId: userId })
      .select("_id outletId temp_ref ")
      .lean()
      .session(session);

    if (!merchantExist) {
      const err = new Error("Merchant not registered, first register yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(merchantExist, "merchantExist");

    await session.commitTransaction();

    let result;

    try {
      result = await biometricKyc({
        userId,
        requestId, //client send idempotency
        client_referenceId: referenceId, //auto genertae
        referenceKey: merchantExist?.temp_ref,
        mcode: merchantExist?.outletId,
        latitude,
        longitude,
        captureType,
        biometricData,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log("aepsbiometric kyc service", JSON.stringify(result, null, 2));

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.status_code === "ERR" ||
      result?.status === "ERROR" ||
      result?.status_code !== "TXN"
    ) {
      const err = new Error(result?.message || "API Failed");
      err.statusCode = 400;
      err.data = result?.data;
      throw err;
    }

    console.log(result, "result");
    return result;
  } catch (error) {
    throw error;
  }
};

exports.dailyLogin = async ({
  userId,
  requestId,
  latitude,
  longitude,
  captureType,
  biometricData,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId(); //backend unique
    const dailyAepsLoginCharge = 100;

    const { openingBalance, closingBalance } = await debitWallet({
      userId: userId,
      amount: dailyAepsLoginCharge, //paise
      serviceType: "AEPS",
      referenceId: referenceId,
      description: "Aeps Daily Login Charges",
      session: session,
    });

    const merchantExist = await Merchant.findOne({ userId: userId })
      .select("_id outletId")
      .lean()
      .session(session);

    if (!merchantExist) {
      const err = new Error("Merchant not registered, first register yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(merchantExist, "merchantExist");

    await DailyAepsLogin.create(
      [
        {
          referenceId: referenceId,
          userId: userId,
          outletId: merchantExist?.outletId,
          loginDate: Date.now(),
          status: "PENDING",
        },
      ],
      { session: session },
    );

    await session.commitTransaction();

    let result;

    try {
      result = await dailyLogin({
        userId,
        requestId, //client send idempotency
        client_referenceId: referenceId, //auto genertae
        mcode: merchantExist?.outletId,
        latitude,
        longitude,
        captureType,
        biometricData,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log("daily login service", JSON.stringify(result, null, 2));

    console.log("Status", result?.status_code || result?.status);

    if (result?.status_code === "TXN" || result?.statuscode === "TXN") {
      await DailyAepsLogin.updateOne(
        { referenceId },
        {
          $set: {
            status: "SUCCESS",
            lastLoginAt: Date.now(),
          },
        },
      );

      await Merchant.updateOne(
        { userId },
        {
          $set: {
            lastLoginAt: new Date(),
            isLoginRequired: false,
          },
        },
      );
    } else if (
      result?.status === "FAILED" ||
      result?.status_code === "ERR" ||
      result?.status === "ERROR" ||
      result?.status_code !== "TXN"
    ) {
      const refundSession = await mongoose.startSession();
      try {
        refundSession.startTransaction();

        await processRefund({
          userId: userId,
          amount: dailyAepsLoginCharge,
          referenceId: referenceId,
          description: `Refund: Daily Login Failed - ${apiError.message}`,
          session: refundSession,
        });

        await DailyAepsLogin.updateOne(
          { referenceId },
          { $set: { status: "REFUNDED" } },
          { session: refundSession },
        );

        await refundSession.commitTransaction();
      } catch (refundError) {
        if (refundSession.inTransaction()) {
          await refundSession.abortTransaction();
        }
        console.error("CRITICAL: Refund Sync Failed", refundError);
      } finally {
        refundSession.endSession();
      }

      const err = new Error(result?.message || "API Failed");
      err.statusCode = 400;
      err.data = result?.data;
      throw err;
    }

    console.log(result, "result");

    return result;
  } catch (error) {
    throw error;
  }
};

exports.doBalanceEnquiry = async ({
  userId,
  requestId,
  mobile,
  iin,
  latitude,
  longitude,
  captureType,
  biometricData,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId(); //backend unique

    const merchantExist = await Merchant.findOne({ userId: userId })
      .select("_id outletId")
      .lean()
      .session(session);

    if (!merchantExist) {
      const err = new Error("Merchant not registered, first register yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(merchantExist, "merchantExist");

    await session.commitTransaction();

    let result;

    try {
      result = await balanceEnquiry({
        userId,
        requestId, //client send idempotency
        client_referenceId: referenceId, //auto genertae
        mcode: merchantExist?.outletId,
        mobile,
        bankiin: iin,
        latitude,
        longitude,
        captureType,
        biometricData,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log("Balnce Enquiry Service", JSON.stringify(result, null, 2));

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.status_code === "ERR" ||
      result?.status === "ERROR" ||
      result?.status_code !== "TXN"
    ) {
      const err = new Error(result?.message || "API Failed");
      err.statusCode = 400;
      err.data = result?.data;
      throw err;
    }

    console.log(result, "result");
    return result;
  } catch (error) {
    throw error;
  }
};

exports.doMiniStatement = async ({
  userId,
  requestId,
  mobile,
  iin,
  latitude,
  longitude,
  captureType,
  biometricData,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId(); //backend unique

    const merchantExist = await Merchant.findOne({ userId: userId })
      .select("_id outletId")
      .lean()
      .session(session);

    if (!merchantExist) {
      const err = new Error("Merchant not registered, first register yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(merchantExist, "merchantExist");

    await session.commitTransaction();

    let result;

    try {
      result = await miniStatement({
        userId,
        requestId, //client send idempotency
        client_referenceId: referenceId, //auto genertae
        mcode: merchantExist?.outletId,
        mobile,
        bankiin: iin,
        latitude,
        longitude,
        captureType,
        biometricData,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log("Mini Statement Service", JSON.stringify(result, null, 2));

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.status_code === "ERR" ||
      result?.status === "ERROR" ||
      result?.status_code !== "TXN"
    ) {
      const err = new Error(result?.message || "API Failed");
      err.statusCode = 400;
      err.data = result?.data;
      throw err;
    }

    console.log(result, "result");
    return result;
  } catch (error) {
    throw error;
  }
};

exports.doCashWithdraw = async ({
  userId,
  requestId,
  mobile,
  iin,
  amount, //paise
  latitude,
  longitude,
  captureType,
  biometricData,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId(); //backend unique

    const merchantExist = await Merchant.findOne({ userId: userId })
      .select("_id outletId")
      .lean()
      .session(session);

    if (!merchantExist) {
      const err = new Error("Merchant not registered, first register yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(merchantExist, "merchantExist");

    await session.commitTransaction();

    let result;

    try {
      result = await cashWithdraw({
        userId,
        requestId, //client send idempotency
        client_referenceId: referenceId, //auto genertae
        mcode: merchantExist?.outletId,
        mobile,
        bankiin: iin,
        amount, //paise
        latitude,
        longitude,
        captureType,
        biometricData,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log("Cash withdraw Service", JSON.stringify(result, null, 2));

    console.log("Status", result?.status_code || result?.status);

    if (result?.status_code === "TXN" || result?.statuscode === "TXN") {
      const withdrawSession = await mongoose.startSession();

      try {
        withdrawSession.startTransaction();

        const { openingBalance, closingBalance } = creditWallet({
          userId: userId,
          amount: amount, // paise
          walletType: "aeps",
          serviceType: "AEPS",
          referenceId: referenceId,
          description: "Aeps Cash Withdrawal",
          session: withdrawSession,
        });

        await withdrawSession.commitTransaction();
      } catch (error) {
        console.log(error, "Error in aeps wallet credit session");
        if (withdrawSession.inTransaction()) {
          await withdrawSession.abortTransaction();
        }
      } finally {
        withdrawSession.endSession();
      }
    } else if (
      result?.status === "FAILED" ||
      result?.status_code === "ERR" ||
      result?.status === "ERROR" ||
      result?.status_code !== "TXN"
    ) {
      const err = new Error(result?.message || "API Failed");
      err.statusCode = 400;
      err.data = result?.data;
      throw err;
    }

    console.log(result, "result");
    return result;
  } catch (error) {
    throw error;
  }
};
