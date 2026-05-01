const axios = require("axios");

const sozoClient = axios.create({
  baseURL: process.env.SOZO_BASE_URL,
  timeout: 30000,
});

module.exports = sozoClient;
