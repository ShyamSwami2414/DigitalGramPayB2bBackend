const csplClient = require("../../../cspl.client");
const EkoAepsLogs = require("../../../../../models/ekoAepsLogsModel");
const FormData = require("form-data");
const fs = require("fs");

exports.activateAepsService = async ({
  client_referenceId,
  userId,
  requestId, //idempotency key
  userCode,
  initiatorId,
  address,
  officeAddress,
  bank,
  ifsc,
  accountNumber,
  aadhaar,
  latitude,
  longitude,
  deviceNumber,
  modelName,
  aadhaarFrontFile,
  aadhaarBackFile,
  panFile,
}) => {
  const serviceCode = 43;
  const shopType = 4900;
  const timestamp = new Date().toISOString();
  const startTime = Date.now();

  const form = new FormData();

  //  FILES
  form.append("pan_card", fs.createReadStream(panFile.path), {
    filename: panFile.originalname,
    contentType: panFile.mimetype,
  });

  form.append("aadhar_front", fs.createReadStream(aadhaarFrontFile.path), {
    filename: aadhaarFrontFile.originalname,
    contentType: aadhaarFrontFile.mimetype,
  });

  form.append("aadhar_back", fs.createReadStream(aadhaarBackFile.path), {
    filename: aadhaarBackFile.originalname,
    contentType: aadhaarBackFile.mimetype,
  });

  // SIMPLE FIELDS
  form.append("client_ref_id", client_referenceId);
  form.append("ifsc", ifsc);
  form.append("account", accountNumber);
  form.append("aadhar", aadhaar);
  form.append("latlong", `${latitude},${longitude}`);
  form.append("devicenumber", deviceNumber);
  form.append("modelname", modelName);
  form.append("shop_type", shopType);
  form.append("service_code", serviceCode);
  form.append("user_code", userCode);
  form.append("initiator_id", initiatorId);

  //  NESTED
  form.append("office_address[line]", officeAddress.line);
  form.append("office_address[city]", officeAddress.city);
  form.append("office_address[state]", officeAddress.state);
  form.append("office_address[state_id]", officeAddress.state_id);
  form.append("office_address[pincode]", officeAddress.pincode);
  form.append("office_address[district]", officeAddress.district);

  form.append("address_as_per_proof[line]", address.line);
  form.append("address_as_per_proof[city]", address.city);
  form.append("address_as_per_proof[state]", address.state);
  form.append("address_as_per_proof[state_id]", address.state_id);
  form.append("address_as_per_proof[pincode]", address.pincode);
  form.append("address_as_per_proof[district]", address.district);

  // console.log("BEFORE AXIOS CALL");

  // csplClient.interceptors.request.use((req) => {
  //   console.log("REQUEST HIT");
  //   return req;
  // });

  try {
    const response = await csplClient.post("e1/aeps/activate", form, {
      headers: {
        ...form.getHeaders(),
        "X-TIMESTAMP": timestamp,
        "X-REQUEST-ID": client_referenceId,
        "X-API-KEY": process.env.CSPL_API_KEY,
        "X-Forwarded-For": process.env.SERVER_IP,
      },

      maxBodyLength: Infinity,
      maxContentLength: Infinity,

      // Accept any status code < 500 as "valid" so Axios doesn't throw
      validateStatus: (status) => status < 500,
    });

    console.log(response.data, "response");

    const responseTime = Date.now() - startTime;

    const isSuccess =
      response?.data?.http_code === 200 &&
      (response?.data?.data?.service_status_desc === "Pending" ||
        response?.data?.data?.service_status_desc === "Activated");

    console.log(isSuccess, "isSuccess");

    let providerStatus = isSuccess ? "SUCCESS" : "FAILED";

    if (providerStatus !== "SUCCESS") {
      throw {
        providerStatus: providerStatus,
        error: response?.data?.error,
        message: response?.data?.message,
        reason: response?.data?.data?.data?.reason,
        fullResponse: response?.data,
      };
    }

    await EkoAepsLogs.create({
      providerTxnId: response?.data?.txn_ref || undefined,
      userId: userId,
      referenceId: client_referenceId,
      type: "AEPS-SERVICE-ACTIVATION",
      providerName: "EKO",
      endPoint: "e1/aeps/activate",
      method: "POST",
      request: {
        service_code: serviceCode,
        address_as_per_proof: address,
        office_address: officeAddress,
        ifsc: ifsc,
        account: accountNumber,
        aadhar: aadhaar,
        latlong: `${latitude}, ${longitude}`,
        devicenumber: deviceNumber,
        modelname: modelName,
        shop_type: shopType,
        user_code: userCode,
        initiator_id: initiatorId,
      },

      response: response.data,
      providerStatus: providerStatus,
      responseTime,
    });

    return response?.data;
  } catch (error) {
    console.log(
      "API Error Response:",
      error?.error || error.response?.data || error?.message,
    );

    await EkoAepsLogs.create({
      providerTxnId: error?.response?.data?.txn_ref || undefined,
      userId: userId,
      referenceId: client_referenceId,
      type: "AEPS-SERVICE-ACTIVATION",
      providerName: "EKO",
      endPoint: "e1/aeps/activate",
      method: "POST",
      request: {
        service_code: serviceCode,
        address_as_per_proof: address,
        office_address: officeAddress,
        ifsc: ifsc,
        account: accountNumber,
        aadhar: aadhaar,
        latlong: `${latitude}, ${longitude}`,
        devicenumber: deviceNumber,
        modelname: modelName,
        shop_type: shopType,
        user_code: userCode,
        initiator_id: initiatorId,
      },

      response: error.fullResponse ||
        error.response?.data || { message: error.message },
      providerStatus: "FAILED",
      responseTime: Date.now() - startTime,
    });
    throw error;
  }
};
