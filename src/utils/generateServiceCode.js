exports.generateServiceCode = (name = "") => {
  if (!name) {
    throw new Error("Service Name is required");
  }
  const prefix = "SERV";

  const firstLetter = name?.trim()?.charAt(0)?.toUpperCase() || "X";

  const randomNumber = Math.floor(100 + Math.random() * 900);

  const serviceCode = `${prefix}${firstLetter}${randomNumber}`;
  console.log("Generated Service Code:", serviceCode);
  return serviceCode;
};
