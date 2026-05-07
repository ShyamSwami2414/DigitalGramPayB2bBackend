exports.generatePackageCode = (name = "") => {
  if (!name) {
    throw new Error("Package Name is required");
  }
  const prefix = "CSPL";

  const firstLetter = name?.trim()?.charAt(0)?.toUpperCase() || "X";

  const randomNumber = Math.floor(100 + Math.random() * 900);

  const packageCode = `${prefix}${firstLetter}${randomNumber}`;
  console.log("Generated Package Code:", packageCode);
  return packageCode;
};
