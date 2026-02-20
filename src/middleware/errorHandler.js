const errorHandler = (err, req, res, next) => {
    console.error("Error:", err);

    // mongoose validation
    if (err.name === "ValidationError") {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            message: "Validation Error",
            errors
        });
    }

    // duplicate key
    if (err.code === 11000) {
        return res.status(400).json({
            success: false,
            message: "Duplicate entry detected",
            field: Object.keys(err.keyValue)[0],
        });
    }

    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
};

module.exports = errorHandler;