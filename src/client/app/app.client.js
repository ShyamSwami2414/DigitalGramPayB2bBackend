const axios = require("axios");

const appClient = axios.create({
  baseURL: process.env.APP_BASE_URL,
  timeout: 30000,
});

module.exports = appClient;
