const xml2js = require("xml2js");

/**
 * Parses Mantra Biometric XML into a flat JSON object.
 * @param {string} xmlString - The raw XML from the device.
 * @returns {Promise<Object>} - Formatted JSON.
 */

const parseMantraXml = async (xmlString) => {
  const parser = new xml2js.Parser({
    explicitArray: false,
    mergeAttrs: true,
    trim: true,
  });

  try {
    const result = await parser.parseStringPromise(xmlString);
    if (!result || !result.PidData) {
      throw new Error("Invalid XML structure: Missing PidData root.");
    }

    const pidData = result.PidData;
    const deviceInfo = pidData.DeviceInfo || {};

    // Normalize Params: xml2js makes a single item an Object, multiple items an Array.
    // We force it into an Array to use .find() safely.
    let params = deviceInfo.additional_info?.Param || [];
    if (!Array.isArray(params)) params = [params];

    const getParam = (name) =>
      params.find((p) => p.name === name)?.value || null;

    return {
      dc: deviceInfo.dc || null,
      ci: pidData.Skey?.ci || null,
      hmac: pidData.Hmac || null,
      dpId: deviceInfo.dpId || null,
      mc: deviceInfo.mc || null,
      pidDataType: pidData.Data?.type || "X",
      rdsId: deviceInfo.rdsId || null,
      sessionKey: pidData.Skey?._ || null,
      mi: deviceInfo.mi || null,
      errInfo: pidData.Resp?.errInfo || "Unknown Error",
      errCode: pidData.Resp?.errCode || "-1",
      fCount: pidData.Resp?.fCount || "0",
      fType: pidData.Resp?.fType || "0",
      iCount: "0",
      iType: null,
      pCount: "0",
      pType: null,
      srno: getParam("srno"),
      sysid: getParam("sysid"),
      ts: getParam("ts"),
      pidData: pidData.Data?._ || null,
      qScore: pidData.Resp?.qScore || "0",
      nmPoints: pidData.Resp?.nmPoints || "0",
      rdsVer: deviceInfo.rdsVer || null,
    };
  } catch (err) {
    throw new Error(`XML Parsing Error: ${err.message}`);
  }
};

module.exports = { parseMantraXml };
