const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema({

    requireAdminApprovalForCredentials: {
        type: Boolean,
        default: false
    },

    title: {
        type: String,
        default: ""
    },

    logoUrl: {
        type: String,
        default: ""
    },

    faviconUrl: {
        type: String,
        default: ""
    },

    qrCodeUrl: {
        type: String,
        default: ""
    },

    email: {
        type: String,
        default: ""
    },

    phone: {
        type: String,
        default: ""
    },

    address: {
        type: String,
        default: ""
    },
},
    {
        timestamps: true,
        versionKey: false
    }
);

module.exports = mongoose.model("Setting", settingSchema);