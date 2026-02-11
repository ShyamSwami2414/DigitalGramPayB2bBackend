const mongoose = require("mongoose");

const kycSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    fatherName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },

    dob: {
        type: Date,
        required: true,
    },

    gender: {
        type: String,
        enum: ["male", "female", "other"],
        required: true
    },

    address: { type: String, required: true },
    district: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },

    aadhaarNumber: { type: String, required: true },
    //images
    aadharFront: { type: String, required: true },
    aadharBack: { type: String, required: true },

    panNumber: { type: String, required: true },
    panImage: { type: String, required: true },

    shopName: { type: String, required: true },
    shopAddress: { type: String, required: true },
    shopImage: { type: String, required: true },

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