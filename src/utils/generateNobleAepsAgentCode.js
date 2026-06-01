const NobleAepsAgent = require("../models/nobleAepsAgentModel");

exports.generateAgentCode = async () => {
  const prefix = "NAC";

  let agentCode;
  let exists = true;

  while (exists) {
    // random 7 digit number
    const randomNumber = Math.floor(1000000 + Math.random() * 9000000);

    agentCode = `${prefix}${randomNumber}`;

    exists = await NobleAepsAgent.exists({
      agentCode: agentCode,
    });
  }

  return agentCode;
};
