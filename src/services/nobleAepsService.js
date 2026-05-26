const { generateAgentCode } = require("../utils/generateNobleAepsAgentCode");
const mongoose = require("mongoose");
const {
  generateUniqueRefernceId,
} = require("../utils/generateUniqueReferenceId");
const { debitWallet } = require("./common/walletService");
const { agentOnboard } = require("../client/cspl/apis/aeps/noble/agentOnboard");
const { processRefund } = require("./common/refundService");
const NobleAepsState = require("../models/nobleAepsStateModel");
const NobleAepsAgent = require("../models/nobleAepsAgentModel");
const NobleAepsReport = require("../models/nobleAepsReportModel");
const Transaction = require("../models/transactionModel");
const { loadAgent } = require("../client/cspl/apis/aeps/noble/loadAgent");
const { kyc } = require("../client/cspl/apis/aeps/noble/biometricKyc");
const { dailyLogin } = require("../client/cspl/apis/aeps/noble/dailyLogin");
const {
  validateUserPackageAndService,
} = require("./common/validateUserPackageAndService");
const {
  agentOnboardStatus,
} = require("../client/cspl/apis/aeps/noble/agentOnboardStatus");
const { transaction } = require("../client/cspl/apis/aeps/noble/transaction");

exports.nobleAepsOnboardAgent = async ({
  userId,
  requestId,
  channel,
  ipAddress,

  firstName,
  middleName,
  lastName,
  email,
  mobileNumber,

  aadhaar,
  panNumber,
  dob,
  agentCode,

  address,
  state,
  city,
  pincode,
  bankName,
  bankAccountNumber,
  bankIfsc,
  shopName,
  shopAddress,
  shopState,
  shopCity,
  shopPincode,
  shopLongitude,
  shopLatitude,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId("NAE");
    const registrationCharges = 1000;
    // const encryptedAadhaar = encryptAadhaar(aadhaar);

    console.log(agentCode, "agentCode");
    console.log(typeof agentCode, "agentCode type");

    const [agentStateCode, shopStateCode] = await Promise.all([
      NobleAepsState.findOne({ _id: state }).select("stateCode").lean(),

      NobleAepsState.findOne({ _id: shopState }).select("stateCode").lean(),
    ]);

    // Validation
    if (!agentStateCode) {
      const err = new Error("Agent state not found");
      err.statusCode = 404;
      throw err;
    }

    if (!shopStateCode) {
      const err = new Error("Shop state not found");
      err.statusCode = 404;
      throw err;
    }

    const { openingBalance, closingBalance } = await debitWallet({
      userId: userId,
      amount: registrationCharges, //paise
      serviceType: "AEPS",
      serviceCategory: "ONE_TIME_CHARGES",
      referenceId: referenceId,
      description: "Aeps Registration Charges",
      session: session,
    });

    await session.commitTransaction();

    let result;

    try {
      result = await agentOnboard({
        client_referenceId: referenceId, //auto genertae
        userId,
        agentCode: agentCode,
        requestId,
        channel,
        ipAddress,

        firstName,
        middleName,
        lastName,
        email,
        mobileNumber,

        aadhaar,
        panNumber,
        dob,

        address,
        agentStateCode: agentStateCode.stateCode,
        city,
        pincode,
        bankName,
        bankAccountNumber,
        bankIfsc,
        shopName,
        shopAddress,
        shopStateCode: shopStateCode.stateCode,
        shopCity,
        shopPincode,
        shopLongitude,
        shopLatitude,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Something went wrong",
        // data: error?.response?.data || null,
      };
    }

    console.log(
      "aeps agent onboard registration service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.data?.statusCode || result?.data?.status);

    if (result?.status === "FAILED" || result?.data?.statusCode !== "AG0001") {
      console.log("Entered");
      const { openingBalance, closingBalance } = await processRefund({
        userId: userId,
        amount: registrationCharges, //paise
        serviceType: "AEPS",
        serviceCategory: "ONE_TIME_CHARGES",
        referenceId: referenceId,
        walletType: "main",
        description: "Agent Register Failed, Charges Refunded",
        apiResponse: result,
      });
    }

    if (
      result?.status === "FAILED" ||
      result?.status === "ERROR" ||
      result?.data?.statusCode !== "AG0001"
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    throw error;
  }
};

exports.retrieveUniqueAgentId = async ({ userId, requestId }) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId("NAE");

    const agentExist = await NobleAepsAgent.findOne({ userId: userId })
      .select("_id agentCode panNumber")
      .lean()
      .session(session);

    if (!agentExist) {
      const err = new Error("User not registered, first onboard yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(agentExist, "agentExist");

    await session.commitTransaction();

    let result;

    try {
      result = await agentOnboardStatus({
        client_referenceId: referenceId, //auto genertae
        userId: userId,
        requestId, //client send idempotency
        agentCode: agentExist?.agentCode,
        panNumber: agentExist?.panNumber,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error?.response?.data?.description ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log(
      " onboard status check service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.data?.statusCode || result?.data?.status);

    if (result?.data?.statusCode === "AG0001") {
      const successSession = await mongoose.startSession();
      try {
        console.log("entered success data");
        successSession.startTransaction();

        const data = result?.data?.responseData?.[0];
        console.log(data, "data");
        console.log(data?.uniqueAgentId, "uniqueAgentId");

        const agentUpdate = await NobleAepsAgent.findOneAndUpdate(
          { userId: new mongoose.Types.ObjectId(userId) },
          {
            $set: {
              uniqueAgentId: data?.uniqueAgentId,
            },
          },
          { new: true, session: successSession },
        );

        if (!agentUpdate) {
          const err = new Error("Merchant not exist");
          err.statusCode = 404;
          throw err;
        }

        await successSession.commitTransaction();
      } catch (error) {
        console.log(error, "check  status updation error in session");

        if (successSession.inTransaction()) {
          await successSession.abortTransaction();
        }
      } finally {
        successSession.endSession();
      }
    } else if (
      result?.data?.statusCode !== "AG0001" ||
      result?.status === "FAILED" ||
      result?.status === "ERROR"
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    throw error;
  }
};

exports.loadAepsAgent = async ({ userId, requestId }) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId("NAE");

    const agentExist = await NobleAepsAgent.findOne({ userId: userId })
      .select("_id uniqueAgentId")
      .lean()
      .session(session);

    if (!agentExist) {
      const err = new Error("User not registered, first onboard yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(agentExist, "agentExist");

    await session.commitTransaction();

    let result;

    try {
      result = await loadAgent({
        client_referenceId: referenceId, //auto genertae
        userId: userId,
        requestId, //client send idempotency
        uniqueAgentId: agentExist?.uniqueAgentId,
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

    console.log(" status check service", JSON.stringify(result, null, 2));

    console.log("Status", result?.data?.statusCode || result?.data?.status);

    if (result?.data?.statusCode === "AG0001") {
      const successSession = await mongoose.startSession();
      try {
        console.log("entered success data");
        successSession.startTransaction();

        const data = result?.data?.responseData?.[0];
        console.log(data, "data");
        console.log(data?.kycRequired, "kycRequired");
        console.log(data?.Daily2fa_AEPS_Required, "is2faLoginRequired");

        const isKycStatusApproved = data?.kycRequired === "YES";
        const is2faLoginRequired = data?.Daily2fa_AEPS_Required === "YES";

        console.log(isKycStatusApproved, "isKycStatusApproved");

        const agentUpdate = await NobleAepsAgent.findOneAndUpdate(
          { userId: new mongoose.Types.ObjectId(userId) },
          {
            $set: {
              isAepsEnabled: isKycStatusApproved ? true : false,
              isLoginRequired: is2faLoginRequired ? true : false,
            },
          },
          { new: true, session: successSession },
        );

        if (!agentUpdate) {
          const err = new Error("Merchant not exist");
          err.statusCode = 404;
          throw err;
        }

        await successSession.commitTransaction();
      } catch (error) {
        console.log(error, "check  status updation error in session");

        if (successSession.inTransaction()) {
          await successSession.abortTransaction();
        }
      } finally {
        successSession.endSession();
      }
    } else if (
      result?.data?.statusCode !== "AG0001" ||
      result?.status === "FAILED" ||
      result?.status === "ERROR"
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
  bioType,
  pidData,
  bussinessNature,
  annualIncome,
  channel,
  ipAddress,
  userAgent,
  mobileDeviceId,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId("NAE"); //backend unique

    const bioTypeMap = {
      FINGER: 0,
      FACE: 1,
      IRIS: 2,
    };

    const bioTypeCode = bioTypeMap[bioType];

    console.log(bioTypeCode, "bioTypeCode");

    const agentExist = await NobleAepsAgent.findOne({ userId: userId })
      .select("_id uniqueAgentId")
      .lean()
      .session(session);

    if (!agentExist) {
      const err = new Error("Merchant not onboarded , first register yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(agentExist, "agentExist");

    await session.commitTransaction();

    let result;

    try {
      result = await kyc({
        userId: userId,
        requestId: requestId, //client send idempotency
        transactionId: referenceId, //auto genertae
        uniqueAgentId: agentExist?.uniqueAgentId,
        latitude,
        longitude,
        bioType: bioTypeCode, //code 0, 1, 2 etc
        pidData,
        bussinessNature,
        annualIncome,
        channel,
        ipAddress,
        userAgent,
        mobileDeviceId,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data:
          error?.response?.data || error?.data || error?.fullResponse || null,
      };
    }

    console.log(
      "new aepsbiometric kyc service",
      JSON.stringify(result, null, 2),
    );

    console.log(
      "Status",
      result?.data?.statusCode || result?.data?.status || result?.status,
    );

    if (
      result?.status === "FAILED" ||
      result?.status === "ERROR" ||
      result?.data?.statusCode !== "AG0001"
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

exports.daily2faLogin = async ({
  userId,
  requestId,
  latitude,
  longitude,
  bioType,
  pidData,
  channel,
  ipAddress,
  userAgent,
  mobileDeviceId,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId("NAE"); //backend unique

    const dailyLoginCharges = 100; //paise
    const { openingBalance, closingBalance } = await debitWallet({
      userId: userId,
      amount: dailyLoginCharges, //paise
      serviceType: "AEPS",
      serviceCategory: "DAILY_LOGIN_CHARGES",
      referenceId: referenceId,
      description: "Daily 2fa charges",
      session: session,
    });

    const bioTypeMap = {
      FINGER: 0,
      FACE: 1,
      IRIS: 2,
    };

    const bioTypeCode = bioTypeMap[bioType];

    console.log(bioTypeCode, "bioType");

    const agentExist = await NobleAepsAgent.findOne({ userId: userId })
      .select("_id uniqueAgentId")
      .lean()
      .session(session);

    if (!agentExist) {
      const err = new Error("Merchant not onboarded , first register yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(agentExist, "agentExist");

    await session.commitTransaction();

    let result;

    try {
      result = await dailyLogin({
        userId: userId,
        requestId: requestId, //client send idempotency
        transactionId: referenceId, //auto genertae
        uniqueAgentId: agentExist?.uniqueAgentId,
        latitude: latitude,
        longitude: longitude,
        bioType: bioTypeCode,
        pidData: pidData,
        channel: channel,
        ipAddress: ipAddress,
        userAgent: userAgent,
        mobileDeviceId: mobileDeviceId,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data:
          error?.response?.data || error?.data || error?.fullResponse || null,
      };
    }

    console.log(
      "new daily login 2fa  service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.data?.statusCode || result?.status);

    if (result?.status === "FAILED" || result?.data?.statusCode !== "AG0001") {
      console.log("Entered");
      const { openingBalance, closingBalance } = await processRefund({
        userId: userId,

        amount: dailyLoginCharges, //paise
        serviceType: "AEPS",
        serviceCategory: "DAILY_LOGIN_CHARGES",

        referenceId: referenceId,
        walletType: "main",
        description: "Daily 2fa Failed, Charges Refunded",
        apiResponse: result,
      });
    }

    if (
      result?.status === "FAILED" ||
      result?.status === "ERROR" ||
      result?.data?.statusCode !== "AG0001"
    ) {
      throw result;
    }

    console.log(result, "result");
    return result;
  } catch (error) {
    throw error;
  }
};

exports.initiateAepsTransaction = async ({
  userId,
  requestId,
  latitude,
  longitude,
  bioType,
  pidData,
  aadhaar,
  customerMobile,
  channel,
  ipAddress,
  userAgent,
  mobileDeviceId,
  transactionType,
  serviceTypeName,
  amount,
  bankIn,
  bankName,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId("NAE");

    const { packageId, serviceId } = await validateUserPackageAndService({
      userId: userId,
      serviceName: "aeps",
      serviceType: serviceTypeName,
      pipeline: "aeps3",
      amount: amount, //paise
    });

    const existingAgent = await NobleAepsAgent.findOne({
      userId: userId,
    })
      .select("uniqueAgentId agentCode")
      .lean()
      .session(session);

    if (!existingAgent) {
      const err = new Error("User not onboarded yet, first register yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(existingAgent, "existingAgent");

    await NobleAepsReport.create(
      [
        {
          userId: userId,
          agentCode: existingAgent?.agentCode,
          uniqueAgentId: existingAgent?.uniqueAgentId,
          serviceType: `${serviceTypeName}`,
          providerName: "NOBLE",
          referenceId: referenceId,
          txnStatus: "PENDING",
          amount: amount, //paise
        },
      ],
      { session: session },
    );

    await Transaction.create(
      [
        {
          userId: userId,
          referenceId: referenceId,
          serviceType: "AEPS",
          serviceCategory: serviceTypeName,
          amount: amount, //paise
          wallet: "aeps",
          // type: "credit",
          status: "INITIATED",
          meta: {
            request: {
              transactionId: referenceId, //auto genertae
              userId: userId,
              requestId: requestId, //client send idempotency
              serviceType: transactionType,
              uniqueAgentId: existingAgent?.uniqueAgentId,
              agentCode: existingAgent?.agentCode,
              customerMobile: customerMobile,
              aadhaar: aadhaar,
              latitude: latitude,
              longitude: longitude,
              channel: channel,
              amount: amount,
              bankIn: bankIn,
              bankName: bankName,

              pidData: pidData,
              serviceTypeName: serviceTypeName,
            },
          },
        },
      ],
      { session: session },
    );

    await session.commitTransaction();

    let result;

    try {
      result = await transaction({
        userId: userId,
        requestId: requestId, //client send idempotency
        transactionId: referenceId, //auto genertae
        uniqueAgentId: existingAgent?.uniqueAgentId,
        agentCode: existingAgent?.agentCode,
        channel: channel,
        mobileDeviceId: mobileDeviceId,
        ipAddress: ipAddress,
        userAgent: userAgent,
        latitude: latitude,
        longitude: longitude,
        transactionType: transactionType,
        amount: amount,
        bankIn: bankIn,
        bankName: bankName,
        aadhaar: aadhaar,
        mobileNumber: mobileNumber,
        bioType: bioType,
        pidData: pidData,
      });
    } catch (error) {
      result = {
        status: false,
        reason: error?.comment,
        message:
          error?.comment ||
          error?.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log(
      "aeps eko initiate transaction service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.status);

    if (
      result?.status === true &&
      result?.txn_status === "success" &&
      result?.data?.response_status_id === 0 &&
      result?.data?.status === 0
    ) {
      console.log("Entered Success Block");
      const successSession = await mongoose.startSession();
      const data = result?.data?.data;

      let openingBalance = 0;
      let closingBalance = 0;

      try {
        successSession.startTransaction();

        if (serviceTypeName === "STATEMENT") {
          const miniStatementCommission = 100; //in paise
          const tdsAmount = calculateTds(miniStatementCommission); //paise
          const netCommission = miniStatementCommission - tdsAmount; //payable to user

          const wallet = await userWallet.findOneAndUpdate(
            { userId: userId, isActive: true, isDeleted: false },
            { $inc: { aepsWallet: netCommission } },
            { new: true, session: successSession },
          );

          closingBalance = wallet.aepsWallet;
          openingBalance = closingBalance - netCommission;

          await walletLedgerModel.create(
            [
              {
                userId: userId,
                serviceType: "AEPS",
                serviceCategory: "MINI_STATEMENT",
                entryType: "COMMISSION",
                wallet: "aeps",
                type: "credit",
                amount: netCommission,
                referenceId: referenceId,
                openingBalance: openingBalance,
                closingBalance: closingBalance,
                description: "Aeps Mini Statement Commission",
              },
            ],
            { session: successSession },
          );

          await tdsLedgerModel.create(
            [
              {
                userId: userId,
                referenceId: referenceId,
                commissionAmount: miniStatementCommission,
                tdsRate: 2, //percent
                netCommission: netCommission,
                tdsAmount: tdsAmount,
              },
            ],
            { session: successSession },
          );

          await Transaction.updateOne(
            {
              referenceId: referenceId,
            },
            {
              $set: {
                status: "SUCCESS",
                providerTxnId: result?.txn_ref,
                remark: result ? result?.message : "",
                "meta.response": result ? result : "",
              },
            },
            { session: successSession },
          );
        } else if (serviceTypeName === "WITHDRAWAL") {
          const { openingBalance, closingBalance } = await creditWallet({
            userId: userId,
            amount: amount, // paise
            walletType: "aeps",
            serviceType: "AEPS",
            serviceCategory: "CASH_WITHDRAWAL",
            referenceId: referenceId,
            description: "Aeps Cash Withdrawal",
            session: successSession,
          });

          const { commission, tdsAmount, netCommission } =
            await processCommission({
              userId: userId,
              amount: amount, //paise
              packageId: packageId,
              serviceId: serviceId,
              serviceType: "AEPS",
              walletType: "aeps",
              serviceCategory: "CASH_WITHDRAWAL",
              pipeline: "aeps2",
              referenceId: referenceId,
              providerTxnId: result?.txn_ref,
              description: "Aeps Withdrawal Commission",
              apiMessage: result?.message,
              apiResponse: result,
              session: successSession,
            });
        }

        await EkoAepsReport.findOneAndUpdate(
          { referenceId: referenceId },
          {
            $set: {
              txnStatus: "SUCCESS",
              providerTxnId: data?.tid,
              balance: data?.customer_balance,
              miniStatement: data?.mini_statement_list,
              aadhaar: data?.aadhar,
              message: result?.data?.message,
              reason: data?.comment,
              rawResponse: result,
            },
          },
        );

        console.log(result);
        return {
          ...result,
          referenceId: referenceId,
        };
      } catch (error) {
        throw error;
      }
    } else {
      const failedSession = await mongoose.startSession();
      try {
        failedSession.startTransaction();
        const data = result?.data?.data;
        await EkoAepsReport.findOneAndUpdate(
          { referenceId: referenceId },
          {
            $set: {
              txnStatus: "FAILED",
              providerTxnId: data?.tid,
              accountBalance: data?.customer_balance,
              bankName: data?.bankName,
              aadhaar: data?.aadhar,
              message: result?.data?.message,
              reason: data?.comment,
              rawResponse: result,
            },
          },
          { session: failedSession },
        );

        await Transaction.updateOne(
          { referenceId: referenceId },
          {
            $set: {
              status: "FAILED",
              isRefunded: true,
              remark: result ? result?.message : "",
              "meta.response": result,
            },
          },
          { session: failedSession },
        );

        await failedSession.commitTransaction();
      } catch (error) {
        if (failedSession.inTransaction()) {
          await failedSession.abortTransaction();
        }

        throw result;
      } finally {
        failedSession.endSession();
      }
    }

    console.log(result);
    return result;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
};
