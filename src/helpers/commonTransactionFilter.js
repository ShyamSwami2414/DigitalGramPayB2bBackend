const mongoose = require("mongoose");
const User = require("../models/userModel");
const Service = require("../models/serviceModel");

exports.buildTransactionFilters = async ({ reqUserId, query }) => {
  let {
    user = "",
    service = "",
    status = "",
    from = "",
    to = "",
    range = "",
  } = query;

  user = user?.trim();
  service = service?.trim();
  status = status?.trim().toUpperCase();

  range = typeof range === "string" ? range.trim().toLowerCase() : "";

  from = typeof from === "string" ? from.trim() : "";

  to = typeof to === "string" ? to.trim() : "";

  // NORMALIZE
  if (!from || from === "null" || from === "undefined") {
    from = undefined;
  }

  if (!to || to === "null" || to === "undefined") {
    to = undefined;
  }

  if (!range || range === "null" || range === "undefined") {
    range = undefined;
  }

  const filter = {
    userId: new mongoose.Types.ObjectId(reqUserId),
  };

  const now = new Date();

  let fromDate;
  let toDate;

  const allowedStatus = ["SUCCESS", "FAILED", "PENDING"];

  const allowedRanges = ["today", "yesterday", "last7days", "thismonth"];

  // STATUS VALIDATION
  if (status && !allowedStatus.includes(status)) {
    const err = new Error("Invalid Status");
    err.statusCode = 400;
    throw err;
  }

  // RANGE VALIDATION
  if (range && !allowedRanges.includes(range)) {
    const err = new Error("Invalid Range");
    err.statusCode = 400;
    throw err;
  }

  // FUTURE DATE VALIDATION
  if (from && new Date(from) > now) {
    const err = new Error("Starting Date can not be in future");
    err.statusCode = 400;
    throw err;
  }

  if (to && new Date(to) > now) {
    const err = new Error("Ending Date can not be in future");
    err.statusCode = 400;
    throw err;
  }

  // STATUS FILTER
  if (status) {
    filter.status = status;
  }

  // RANGE FILTERS
  if (range) {
    switch (range) {
      case "today":
        fromDate = new Date();
        fromDate.setHours(0, 0, 0, 0);

        toDate = new Date();
        toDate.setHours(23, 59, 59, 999);
        break;

      case "yesterday":
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 1);
        fromDate.setHours(0, 0, 0, 0);

        toDate = new Date();
        toDate.setDate(toDate.getDate() - 1);
        toDate.setHours(23, 59, 59, 999);
        break;

      case "last7days":
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 6);
        fromDate.setHours(0, 0, 0, 0);

        toDate = new Date();
        toDate.setHours(23, 59, 59, 999);
        break;

      case "thismonth":
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);

        toDate = new Date();
        toDate.setHours(23, 59, 59, 999);
        break;
    }
  } else {
    const isValidDate = (date) => !isNaN(new Date(date).getTime());

    if (from) {
      if (!isValidDate(from)) {
        const err = new Error("Invalid 'from' date");
        err.statusCode = 400;
        throw err;
      }

      fromDate = new Date(from);
    }

    if (to) {
      if (!isValidDate(to)) {
        const err = new Error("Invalid 'to' date");
        err.statusCode = 400;
        throw err;
      }

      toDate = new Date(to);
    }

    if (fromDate && toDate && fromDate > toDate) {
      const err = new Error("'from' cannot be greater than 'to'");

      err.statusCode = 400;
      throw err;
    }

    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }
  }

  // DATE FILTER
  if (fromDate || toDate) {
    filter.createdAt = {};

    if (fromDate) {
      filter.createdAt.$gte = fromDate;
    }

    if (toDate) {
      filter.createdAt.$lte = toDate;
    }
  }

  // USER FILTER
  if (user) {
    if (!mongoose.Types.ObjectId.isValid(user)) {
      const err = new Error("Invalid user ID");
      err.statusCode = 400;
      throw err;
    }

    const userExist = await User.findById(user).lean();

    if (!userExist) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    filter.userId = new mongoose.Types.ObjectId(user);
  }

  // SERVICE FILTER
  if (service) {
    if (!mongoose.Types.ObjectId.isValid(service)) {
      const err = new Error("Invalid service ID");
      err.statusCode = 400;
      throw err;
    }

    const serviceExist = await Service.findById(service).lean();

    if (!serviceExist) {
      const err = new Error("Service not found");
      err.statusCode = 404;
      throw err;
    }

    filter.serviceId = new mongoose.Types.ObjectId(service);
  }

  return filter;
};
