const mongoose = require("mongoose");

const nobleAepsStateSchema = new mongoose.Schema({
  stateCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    unique: true,
  },

  stateName: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
});

module.exports = mongoose.model("NobleAepsState", nobleAepsStateSchema);
