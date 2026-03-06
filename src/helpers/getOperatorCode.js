exports.getOperatorCode = (operator) => {
  const operatorMap = {
    JIO: "Jio",
    AT: "Airtel",
    VI: "VodafoneIdea",
    BSNL: "BSNLTalktime",
  };

  return operatorMap[operator?.toUpperCase()] || null;
};
