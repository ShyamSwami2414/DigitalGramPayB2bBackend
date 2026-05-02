const mongoose = require("mongoose");
const User = require("../models/userModel");
const NobleDmtFinoCustomer = require("../models/nobleFinoDmtCustomerModel");
const {
  generateUniqueRefernceId,
} = require("../utils/generateUniqueReferenceId");

const { debitWallet, creditWallet } = require("./common/walletService");
const { processRefund } = require("./common/refundService");
const { rupeeToPaise, paiseToRupee } = require("../utils/money");

const { encryptAadhaar } = require("../helpers/encryptDecryptAadhar");
const {
  searchCustomer,
} = require("../client/app/apis/dmt/fino/searchCustomer");
const {
  getCustomerLimit,
} = require("../client/app/apis/dmt/fino/getCustomerLimit");
const { customerEkyc } = require("../client/app/apis/dmt/fino/customerEkyc");
const {
  generateRegisterOtp,
} = require("../client/app/apis/dmt/fino/generateRegisterOtp");
const {
  registerCustomer,
} = require("../client/app/apis/dmt/fino/registerCustomer");
const {
  addNobleDmtBeneficiary,
} = require("../client/app/apis/dmt/common/addBeneficiaryClient");
const {
  listNobleDmtBeneficiary,
} = require("../client/app/apis/dmt/common/getBeneficiaryClient");
const {
  deleteNobleDmtBeneficiary,
} = require("../client/app/apis/dmt/common/deleteBeneficiaryClient");
const {
  generateTransactionOtp,
} = require("../client/app/apis/dmt/fino/generateTransactionOtp");
const {
  initiateTransfer,
} = require("../client/app/apis/dmt/fino/initiateTransaction");
const {
  validateUserPackageAndService,
} = require("./common/validateUserPackageAndService");
const { processCharges } = require("./common/chargeService");
const PayoutTransaction = require("../models/sozopayoutTransactionModel");
const Transaction = require("../models/transactionModel");

exports.searchCustomer = async ({
  userId,
  requestId,
  mobileNumber,
  longitude,
  latitude,
  publicIp,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();

    const user = await User.findOne({ _id: userId }).select("phone").lean();

    console.log(user, "user");

    await session.commitTransaction();

    let result;

    try {
      result = await searchCustomer({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        merchantMobileNumber: user?.phone,
        mobileNumber,
        longitude,
        latitude,
        publicIp,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        // data: error?.response?.data || error?.fullResponse || null,
      };
    }

    console.log(
      "serach customer fino service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.data?.status !== 1 ||
      result?.data?.statusCode !== "SS0011" ||
      result?.data?.responseData === null
    ) {
      throw result;
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

exports.getLimit = async ({ userId, requestId, mobileNumber }) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();

    await session.commitTransaction();

    let result;

    try {
      result = await getCustomerLimit({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        mobileNumber,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        // data: error?.response?.data || error?.fullResponse || null,
      };
    }

    console.log(
      "check customer limit service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.data?.status !== 1 ||
      result?.data?.statusCode !== "SS0011" ||
      result?.data?.responseData === null
    ) {
      throw result;
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

exports.customerEkyc = async ({
  userId,
  requestId,
  mobileNumber,
  aadharNumber,
  pidData,
  latitude,
  longitude,
  publicIp,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();

    const user = await User.findOne({ _id: userId }).select("phone").lean();

    console.log(user, "user");

    await session.commitTransaction();

    let result;

    try {
      result = await customerEkyc({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        merchantMobileNumber: user?.phone,
        mobileNumber,
        aadharNumber,
        pidData,
        latitude,
        longitude,
        publicIp,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        // data: error?.response?.data || error?.fullResponse || null,
      };
    }

    console.log("customer ekyc fino service", JSON.stringify(result, null, 2));

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.data?.status !== 1 ||
      result?.data?.statusCode !== "SS0011" ||
      result?.data?.responseData === null
    ) {
      throw result;
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

exports.generateRegOtp = async ({
  userId,
  requestId,
  mobileNumber,
  latitude,
  longitude,
  publicIp,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();

    const [user, dmtCustomer] = await Promise.all([
      User.findById(userId).select("phone").lean(),
      NobleDmtFinoCustomer.findOne({
        userId: userId,
        mobile: mobileNumber,
      })
        .select("customerName")
        .lean(),
    ]);

    console.log(user, "user");

    await session.commitTransaction();

    let result;

    try {
      result = await generateRegisterOtp({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        merchantMobileNumber: user?.phone,
        customerName: dmtCustomer?.customerName,
        mobileNumber,
        latitude,
        longitude,
        publicIp,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        // data: error?.response?.data || error?.fullResponse || null,
      };
    }

    console.log("customer ekyc fino service", JSON.stringify(result, null, 2));

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.data?.status !== 1 ||
      result?.data?.statusCode !== "SS0011" ||
      result?.data?.responseData === null
    ) {
      throw result;
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

exports.registerCustomer = async ({
  userId,
  requestId,
  mobileNumber,
  latitude,
  longitude,
  publicIp,
  otp,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();
    const registrationCharges = 1000; //paise

    const [user, dmtCustomer] = await Promise.all([
      User.findById(userId).select("phone").lean(),
      NobleDmtFinoCustomer.findOne({
        userId: userId,
        mobile: mobileNumber,
      })
        .select(" ekycRequestId otpRequestId")
        .lean(),
    ]);

    if (!dmtCustomer) {
      const err = new Error(
        "Customer not found, complete previous steps properly",
      );
      err.statusCode = 404;
      throw err;
    }

    console.log(user, "user");
    console.log(dmtCustomer, "dmtCustomer");

    const { openingBalance, closingBalance } = await debitWallet({
      userId: userId,
      amount: registrationCharges, //paise
      serviceType: "DMT",
      referenceId: referenceId,
      description: "DMT One Time Registeration Charges",
      session: session,
    });

    await session.commitTransaction();

    let result;

    try {
      result = await registerCustomer({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        merchantMobileNumber: user?.phone,
        mobileNumber,
        latitude,
        longitude,
        publicIp,
        otp,
        otpRequestId: dmtCustomer?.otpRequestId,
        ekycRequestId: dmtCustomer?.ekycRequestId,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        // data: error?.response?.data || error?.fullResponse || null,
      };
    }

    console.log(
      "customer registration fino service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.status);

    if (result?.data?.status === 1 && result?.data?.statusCode === "DB0031") {
      console.log(result);
      return result;
    } else {
      const refundSession = await mongoose.startSession();
      try {
        refundSession.startTransaction();

        await processRefund({
          userId: userId,
          amount: registrationCharges,
          referenceId: referenceId,
          walletType: "main",
          description: `Refund: DMT One Time Registration Failed `,
          session: refundSession,
        });

        await refundSession.commitTransaction();

        console.log(result);
        return result;
      } catch (refundError) {
        if (refundSession.inTransaction()) {
          await refundSession.abortTransaction();
        }
        console.error("CRITICAL: Refund Sync Failed", refundError);
      } finally {
        refundSession.endSession();
      }
    }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
};

exports.generateTOtp = async ({
  userId,
  requestId,
  mobileNumber,
  latitude,
  longitude,
  publicIp,
  otp,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();

    const [user, dmtCustomer] = await Promise.all([
      User.findById(userId).select("phone").lean(),
      NobleDmtFinoCustomer.findOne({
        userId: userId,
        mobile: mobileNumber,
      })
        .select("customerName ekycRequestId otpRequestId")
        .lean(),
    ]);

    console.log(dmtCustomer, "dmtCustomer");
    console.log(user, "user");

    await session.commitTransaction();

    let result;

    try {
      result = await generateTransactionOtp({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        merchantMobileNumber: user?.phone,
        customerName: dmtCustomer?.customerName,
        mobileNumber,
        latitude,
        longitude,
        publicIp,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        // data: error?.response?.data || error?.fullResponse || null,
      };
    }

    console.log("customer ekyc fino service", JSON.stringify(result, null, 2));

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.data?.status !== 1 ||
      result?.data?.statusCode !== "SS0011" ||
      result?.data?.responseData === null
    ) {
      throw result;
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

exports.transferFund = async ({
  userId,
  requestId,
  mobileNumber,
  latitude,
  longitude,
  publicIp,
  otp,
  amount, //paise
  beneficiaryName,
  beneficiaryAccount,
  beneficiaryIfsc,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const referenceId = generateUniqueRefernceId();

    const [user, dmtCustomer] = await Promise.all([
      User.findById(userId).select("phone").lean(),
      NobleDmtFinoCustomer.findOne({
        userId: userId,
        mobile: mobileNumber,
      })
        .select("customerName mobile tOtpRequestId")
        .lean(),
    ]);

    if (!dmtCustomer) {
      const err = new Error(
        "Customer not found, complete previous steps properly",
      );
      err.statusCode = 404;
      throw err;
    }

    console.log(dmtCustomer, "dmtCustomer");
    console.log(user, "user");

    const { packageId, serviceId } = await validateUserPackageAndService({
      userId: userId,
      serviceName: "dmt",
      pipeline: "dmt1",
      amount: amount, //paise
    });

    const { openingBalance, closingBalance } = await debitWallet({
      userId: userId,
      amount: amount, //paise
      serviceType: "DMT",
      referenceId: referenceId,
      description: "DMT - Money Transfer",
      session: session,
    });

    const { charges, gstAmount, totalCharges } = await processCharges({
      userId: userId,
      amount: amount, //paise
      packageId: packageId,
      serviceId: serviceId,
      serviceType: "DMT",
      walletType: "main",

      pipeline: "dmt1",
      referenceId: referenceId,
      reportModel: PayoutTransaction,
      description: "Dmt Payout Charges",

      requestId: requestId,
      bankAccountNumber: beneficiaryAccount,
      ifsc: beneficiaryIfsc,
      name: beneficiaryName,
      phone: dmtCustomer?.mobile,

      session: session,
    });

    await Transaction.create(
      [
        {
          userId: userId,
          referenceId: referenceId,
          serviceType: "DMT",
          amount: amount, //paise
          wallet: "main",
          type: "debit",
          status: "INITIATED",
          meta: {
            request: {
              userId,
              requestId, //client send idempotency

              merchantMobileNumber: user?.phone,
              customerName: dmtCustomer?.customerName,
              mobileNumber: dmtCustomer?.mobile,
              otp: otp,

              beneficiaryName: beneficiaryName,
              beneficiaryAccount: beneficiaryAccount,
              beneficiaryIfsc: beneficiaryIfsc,
              amount: amount, //paise

              tOtpRequestId: dmtCustomer?.tOtpRequestId,
              latitude,
              longitude,
              publicIp,
            },
          },
        },
      ],
      { session: session },
    );

    await session.commitTransaction();

    let result;

    try {
      result = await initiateTransfer({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency

        merchantMobileNumber: user?.phone,
        customerName: dmtCustomer?.customerName,
        mobileNumber: dmtCustomer?.mobile,
        otp: otp,

        beneficiaryName: beneficiaryName,
        beneficiaryAccount: beneficiaryAccount,
        beneficiaryIfsc: beneficiaryIfsc,
        amount: amount, //paise

        tOtpRequestId: dmtCustomer?.tOtpRequestId,
        latitude,
        longitude,
        publicIp,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        // data: error?.response?.data || error?.fullResponse || null,
      };
    }

    console.log(
      "customer trnasfer fino service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.status_code || result?.status);

    if (result?.data?.status === 1 && result?.data?.statusCode === "DB0031") {
      console.log(result);
      return result;
    } else {
      const refundSession = await mongoose.startSession();
      try {
        refundSession.startTransaction();

        await processRefund({
          userId: userId,
          amount: amount, //paise
          referenceId: referenceId,
          walletType: "main",
          description: `Refund: DMT - Money Transfer `,
          session: refundSession,
        });

        await refundSession.commitTransaction();

        console.log(result);
        return result;
      } catch (refundError) {
        if (refundSession.inTransaction()) {
          await refundSession.abortTransaction();
        }
        console.error("CRITICAL: Refund Sync Failed", refundError);
      } finally {
        refundSession.endSession();
      }
    }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
};

exports.listBeneficiary = async ({ userId, requestId, remitterMobile }) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const referenceId = generateUniqueRefernceId();
    const user = await User.findOne({ _id: userId }).select("phone").lean();

    console.log(user, "user");

    await session.commitTransaction();

    let result;

    try {
      result = await listNobleDmtBeneficiary({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        remitterMobile: remitterMobile,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        // data: error?.response?.data || error?.fullResponse || null,
      };
    }

    console.log("add ben dmt service", JSON.stringify(result, null, 2));

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.data?.status !== 1 ||
      result?.data?.statusCode !== "SS0011" ||
      result?.data?.responseData === null
    ) {
      throw result;
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

exports.addBeneficiary = async ({
  userId,
  requestId,
  accountHolderName,
  accountNumber,
  ifsc,
  bankName,
  remitterMobile,
  beneficiaryMobile,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const referenceId = generateUniqueRefernceId();
    const user = await User.findOne({ _id: userId }).select("phone").lean();

    console.log(user, "user");

    await session.commitTransaction();

    let result;

    try {
      result = await addNobleDmtBeneficiary({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        accountHolderName: accountHolderName,
        accountNumber: accountNumber,
        ifsc: ifsc,
        bankName: bankName,
        remitterMobile: remitterMobile,
        beneficiaryMobile: beneficiaryMobile,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        // data: error?.response?.data || error?.fullResponse || null,
      };
    }

    console.log("add ben dmt service", JSON.stringify(result, null, 2));

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.data?.status !== 1 ||
      result?.data?.statusCode !== "SS0011" ||
      result?.data?.responseData === null
    ) {
      throw result;
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

exports.deleteBeneficiary = async ({
  userId,
  requestId,
  remitterMobile,
  accountNumber,
  ifsc,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const referenceId = generateUniqueRefernceId();
    const user = await User.findOne({ _id: userId }).select("phone").lean();

    console.log(user, "user");

    await session.commitTransaction();

    let result;

    try {
      result = await deleteNobleDmtBeneficiary({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        remitterMobile: remitterMobile,
        accountNumber: accountNumber,
        ifsc: ifsc,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        // data: error?.response?.data || error?.fullResponse || null,
      };
    }

    console.log("add ben dmt service", JSON.stringify(result, null, 2));

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.data?.status !== 1 ||
      result?.data?.statusCode !== "SS0011" ||
      result?.data?.responseData === null
    ) {
      throw result;
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
