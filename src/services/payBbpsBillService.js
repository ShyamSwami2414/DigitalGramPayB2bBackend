const { fetchBbpsBill } = require("../client/cspl/apis/fetchBbpsBill");
const { payBbpsBill } = require("../client/cspl/apis/payBbpsBill");
const User = require("../models/userModel");
const WalletLedger = require("../models/walletLedgerModel");
const BbpsReport = require("../models/bbpsReportModel");
const BbpsBiller = require("../models/bbpsBillersModel");
const BbpsCategory = require("../models/bbpsCategoryModel");
const Transaction = require("../models/transactionModel");
const mongoose = require("mongoose");
const {
  generateUniqueRefernceId,
} = require("../utils/generateUniqueReferenceId");
const {
  validateUserPackageAndService,
} = require("./common/validateUserPackageAndService");
const { debitWallet } = require("./common/walletService");
const { processCommission } = require("./common/commissionService");
const { processRefund } = require("./common/refundService");
const { rupeeToPaise, paiseToRupee } = require("../utils/money");

exports.payBbpsBillService = async ({
  userId,
  refId,
  billerId,
  customerName,
  customerMobile,
  dueDate,
  billamount, //paise
  billDate,
  billPeriod,
  billNumber,
  placeholderValue,
  paramValue,
  inputParams,
  additionalInfo,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();

    let packageId, serviceId;

    console.log(billerId, "billerId");

    const biller = await BbpsBiller.findOne({
      billerId: billerId,
      isActive: true,
      isDeleted: false,
    })
      .select("billerId billerCategory")
      .lean();

    console.log(biller, "biller");

    if (!biller) {
      throw new Error("BBPS Biller not found ");
    }

    const billerCategory = await BbpsCategory.findOne({
      name: biller?.billerCategory,
      isActive: true,
      isDeleted: false,
    })
      .select("name")
      .lean();

    if (!billerCategory) {
      throw new Error("BBPS Biller Category not found");
    }

    console.log(billerCategory, "billerCategory");

    try {
      ({ packageId, serviceId } = await validateUserPackageAndService({
        userId: userId,
        serviceName: "bbps",
        pipeline: "bbps1",
        categoryId: billerCategory?._id,
        amount: billamount, //paise
      }));
    } catch (err) {
      console.warn("Service validation failed:", err.message);
      return { status: "FAILED", message: err.message };
    }

    const { openingBalance, closingBalance } = await debitWallet({
      userId: userId,
      amount: billamount, //paise
      serviceType: "BBPS",
      serviceCategory: biller?.billerCategory,
      referenceId: referenceId,
      description: "BBPS Bill Payment",
      session: session,
    });

    await BbpsReport.create(
      [
        {
          userId: userId,
          refId: refId,
          customerName: customerName,
          customerMobile: customerMobile, //customer mobile number not users
          category: billerCategory?.name,
          billerId: billerId,
          billNumber: billNumber,
          billDate: billDate,
          billPeriod: billPeriod,
          amount: billamount, //paise
          referenceId: referenceId,
          status: "INITIATED",
        },
      ],
      { session: session },
    );

    await Transaction.create(
      [
        {
          userId: userId,
          referenceId: referenceId,
          serviceType: "BBPS",
          serviceCategory: biller?.billerCategory,
          amount: billamount, //paise
          wallet: "main",
          type: "debit",
          status: "INITIATED",
          meta: {
            request: {
              ...(refId?.trim() && { refId: refId.trim() }),
              ...(billerId !== undefined && billerId !== null && { billerId }),
              ...(customerName?.trim() && {
                customerName: customerName.trim(),
              }),
              ...(customerMobile?.trim() && {
                customerMobile: customerMobile.trim(),
              }),
              ...(dueDate && { dueDate }),
              ...(additionalInfo && { additionalInfo }),
              ...(billamount !== undefined &&
                billamount !== null && { billamount }),
              ...(billDate && { billDate }),
              ...(billPeriod && { billPeriod }),
              ...(billNumber && { billNumber }),
              ...(placeholderValue && { placeholderValue }),
              ...(paramValue && { paramValue }),
              ...(Array.isArray(inputParams) &&
                inputParams.length > 0 && { inputParams }),
            },
          },
        },
      ],
      { session: session },
    );

    await session.commitTransaction();

    let result;

    try {
      result = await payBbpsBill({
        client_referenceId: referenceId,
        requestId: refId,
        billerId,
        customerName,
        customerMobile,
        dueDate,
        billamount: billamount, //paise
        catname: billerCategory?.name,
        billDate,
        billPeriod,
        billNumber,
        placeholderValue,
        paramValue,
        inputParams,
        additionalInfo,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.data || error?.response?.data || null,
      };
    }

    console.log(
      "Bbps bill pay result service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.status);

    if (result?.status === "PENDING") {
      console.log("Entered Pending Block");
      const pendingSession = await mongoose.startSession();
      try {
        pendingSession.startTransaction();

        await WalletLedger.updateOne(
          { referenceId: referenceId, serviceType: "BBPS" },
          { $set: { status: "PENDING" } },
          { session: pendingSession },
        );

        await BbpsReport.updateOne(
          { referenceId: referenceId },
          {
            $set: {
              status: "PENDING",
              description:
                result?.message ||
                result?.data?.responseReason ||
                "Transaction Pending",
            },
          },
          { session: pendingSession },
        );

        await Transaction.updateOne(
          {
            referenceId: referenceId,
          },
          {
            $set: {
              status: "PENDING",
              providerTxnId: result?.txn_ref,
              remark: result ? result?.message : "",
              "meta.response": result,
            },
          },
          { session: pendingSession },
        );

        await pendingSession.commitTransaction();
        return result;
      } catch (error) {
        if (pendingSession.inTransaction()) {
          await pendingSession.abortTransaction();
        }
        throw error;
      } finally {
        pendingSession.endSession();
      }
    } else if (
      (result?.status === "SUCCESS" || result.status === "SUCCESSFUL") &&
      result?.data?.responseCode === "000"
    ) {
      const { commission, tdsAmount, netCommission } = await processCommission({
        userId: userId,
        amount: billamount, //paise
        packageId: packageId,
        serviceId: serviceId,
        serviceType: "BBPS",
        serviceCategory: biller?.billerCategory,
        categoryId: billerCategory?._id,
        referenceId: referenceId,
        providerTxnId: result?.billerstatus?.txnRefId,
        pipeline: "bbps1",
        reportModel: BbpsReport,
        description: "BBPS Commission",
        apiMessage:
          result?.message ||
          result?.data?.responseReason ||
          "Transaction Successful",
        apiResponse: result,
      });

      result = {
        ...result,
        referenceId: referenceId,
      };

      return result;
    } else if (result?.status === "FAILED" || result?.status === "ERROR") {
      console.log("Entered");
      const { openingBalance, closingBalance } = await processRefund({
        userId: userId,
        amount: billamount, //paise
        referenceId: referenceId,
        serviceType: "BBPS",
        serviceCategory: biller?.billerCategory,
        walletType: "main",
        reportModel: BbpsReport,
        description: "Bbps Bill Failed Refund",
        apiMessage:
          result?.message ||
          result?.data?.responseReason ||
          "Transaction Successful",
        apiResponse: result,
      });
    }

    if (result?.status === "FAILED" || result?.status === "ERROR") {
      return result;
    }

    return result;

    // if (result?.billerstatus?.responseCode) {
    //   return result?.billerstatus;
    // } else {
    //   const errorMessage = result?.billerstatus?.errorInfo?.error?.errorMessage;
    //   console.log(errorMessage, "errorMessage");
    //   throw new Error(errorMessage);
    // }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
};
