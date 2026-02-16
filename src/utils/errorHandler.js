exports.handleError = (error) => {
  console.error("❌ Error:", error);

  // Mongoose validation error
  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map(e => e.message);
    return messages.join(", ");
  }

  // Duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return `${field} already exists`;
  }

  // Cast error (invalid ObjectId)
  if (error.name === "CastError") {
    return "Invalid data provided";
  }

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    return "Invalid token";
  }

  if (error.name === "TokenExpiredError") {
    return "Session expired, please login again";
  }

  // Default safe message
  return error.message || "Something went wrong";
};
