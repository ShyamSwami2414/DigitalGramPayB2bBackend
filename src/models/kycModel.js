const mongoose = require("mongoose");

const kycSchema = new mongoose.Schema({
    firstName: { type: String, required: true, lowercase: true, trim: true },
    lastName: { type: String, required: true, lowercase: true, trim: true },
    fatherName: { type: String, required: true, lowercase: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },

    gender: {
        type: String,
        lowercase: true,
        trim: true,
        enum: ["male", "female", "other"],
        required: true
    },

    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },

    aadhaarNumber: { type: String, required: true },
    aadharImage: { type: String, required: true },

    panNumber: { type: String, required: true },
    panImage: { type: String, required: true },

    shopName: { type: String, required: true },
    shopImage: { type: String, required: true },

    businessPanNumber: { type: String },

    gstNumber: { type: String, required: true },

    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },

}, { timestamps: true, versionKey: false })

module.exports = mongoose.model("Kyc", kycSchema);  