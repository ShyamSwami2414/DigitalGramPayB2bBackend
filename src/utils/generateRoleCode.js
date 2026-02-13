exports.generateRoleCode = (name = "") => {
  if (!roleName) {
    throw new Error("Role Name is required");
  }
  const prefix = "CSPL";

  const firstLetter = name?.trim()?.charAt(0)?.toUpperCase() || "X";

  const randomNumber = Math.floor(100 + Math.random() * 900);

  const roleCode = `${prefix}${firstLetter}${randomNumber}`;
  console.log("Generated Role Code:", roleCode);
  return roleCode;
};
