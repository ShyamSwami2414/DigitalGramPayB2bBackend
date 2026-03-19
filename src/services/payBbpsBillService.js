const { fetchBbpsBill } = require("../client/cspl/apis/fetchBbpsBill");
const { payBbpsBill } = require("../client/cspl/apis/payBbpsBill");
const User = require("../models/userModel");
const BbpsReport = require("../models/bbpsReportModel");
const BbpsBiller = require("../models/bbpsBillersModel");
const BbpsCategory = require("../models/bbpsCategoryModel");
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
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();

    let packageId, serviceId;
    const amountInRupee = paiseToRupee(billamount);
    console.log(amountInRupee, "amountInRupee");

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
      name: biller.billerCategory,
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
        categoryId: billerCategory?._id,
        amount: amountInRupee, //rupee
      }));
    } catch (err) {
      console.warn("Service validation failed:", err.message);
      return { status: "FAILED", message: err.message };
    }

    const { openingBalance, closingBalance } = await debitWallet({
      userId: userId,
      amount: billamount, //paise
      amountInRupee: amountInRupee,
      serviceType: "BBPS",
      referenceId: referenceId,
      description: "BBPS Bill Payment",
      session: session,
    });

    await BbpsReport.create(
      [
        {
          userId: userId,
          mobileNumber: customerMobile, //customer mobile number not users
          amount: amountInRupee, //rupee
          referenceId: referenceId,
        },
      ],
      { session },
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
        billDate,
        billPeriod,
        billNumber,
        placeholderValue,
        paramValue,
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
      "Bbps bill pay result service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result.status);

    if (result.status === "PENDING") {
      await BbpsReport.updateOne({ referenceId }, { status: "PENDING" });
    }

    if (result.status === "SUCCESS") {
      const { commission, tdsAmount, netCommission } = await processCommission({
        userId: userId,
        amount: amountInRupee, //rupee
        packageId: packageId,
        serviceId: serviceId,
        referenceId: referenceId,
        reportModel: BbpsReport,
        description: "BBPS Commission",
      });
    }

    if (result.status === "FAILED") {
      console.log("Entered");
      const { openingBalance, closingBalance } = await processRefund({
        userId: userId,
        amount: amountInRupee, //rupee
        referenceId: referenceId,
        reportModel: BbpsReport,
        description: "Bbps Bill Failed Refund",
      });
    }

    if (result?.status === "FAILED" || result?.status === "ERROR") {
      throw result;
    }

    if (result?.billerstatus?.responseCode) {
      return result?.billerstatus;
    } else {
      const errorMessage = result?.billerstatus?.errorInfo?.error?.errorMessage;
      console.log(errorMessage, "errorMessage");
      throw new Error(errorMessage);
    }
  } catch (error) {
    throw error;
  }
};
