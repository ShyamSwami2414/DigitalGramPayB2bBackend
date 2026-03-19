const axios = require("axios");

const csplClient = axios.create({
  baseURL: process.env.CSPL_BASE_URL,
  timeout: 20000,
});

module.exports = csplClient;
