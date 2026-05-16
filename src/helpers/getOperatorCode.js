exports.getOperatorCode = (operator) => {
  const operatorMap = {
    JIO: "Jio",
    AT: "Airtel",
    VI: "VodafoneIdea",
    VF: "VodafoneIdea",
    BSNL: "BSNLTalktime",
  };

  return operatorMap[operator?.toUpperCase()] || null;
};
