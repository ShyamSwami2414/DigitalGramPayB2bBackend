const Joi = require("joi");

const validateBiometricSchema = (data) => {
  const schema = Joi.object({
    dc: Joi.string().guid({ version: "uuidv4" }).required(), // Validates UUID format
    ci: Joi.string().length(8).required(), // e.g., "20280813"
    hmac: Joi.string().base64().required(), // Ensures valid HMAC base64
    dpId: Joi.string().required(),
    mc: Joi.string().required(), // Large certificate string
    pidDataType: Joi.string().valid("X", "P").required(), // Mantra usually uses 'X'
    rdsId: Joi.string().required(),
    sessionKey: Joi.string().base64().required(),
    mi: Joi.string().required(),
    errInfo: Joi.string().required(),
    errCode: Joi.string().required(),
    fCount: Joi.string().regex(/^\d+$/).required(), // Must be a string number
    fType: Joi.string().regex(/^\d+$/).required(),
    iCount: Joi.string().allow("0", null),
    iType: Joi.any().allow(null),
    pCount: Joi.string().allow("0", null),
    pType: Joi.any().allow(null),
    srno: Joi.string().required(),
    sysid: Joi.string().required(),
    ts: Joi.string().isoDate().required(), // Validates ISO timestamp
    pidData: Joi.string().base64().required(), // The actual biometric blob
    qScore: Joi.string().regex(/^\d+$/).required(),
    nmPoints: Joi.string().regex(/^\d+$/).required(),
    rdsVer: Joi.string().required(),
  });

  return schema.validate(data);
};

module.exports = { validateBiometricSchema };
