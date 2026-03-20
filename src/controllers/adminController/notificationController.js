const Notification = require("../../models/notificationModel");
const mongoose = require("mongoose");

const getAllNotification = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ isDeleted: false })
      .sort({
        createdAt: -1,
      })
      .select("name isActive")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

const createNotification = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      const err = new Error("Notification name is required");
      err.statusCode = 400;
      throw err;
    }

    const existing = await Notification.findOne({
      name: name.trim(),
      isDeleted: false,
    });

    if (existing) {
      const err = new Error("Notification with this name already exists");
      err.statusCode = 400;
      throw err;
    }

    const notification = await Notification.create({
      name: name.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Notification created successfully",
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

const toggleNotificationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid notification ID");
      err.statusCode = 400;
      throw err;
    }

    const notification = await Notification.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!notification) {
      const err = new Error("Notification not found or deleted");
      err.statusCode = 404;
      throw err;
    }

    notification.isActive = !notification.isActive;
    await notification.save();

    return res.status(200).json({
      success: true,
      message: `Notification is now ${notification.isActive ? "active" : "inactive"}`,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid notification ID");
      err.statusCode = 400;
      throw err;
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, isActive: false } },
      { new: true },
    );

    if (!notification) {
      const err = new Error("Notification not found or already deleted");
      err.statusCode = 404;
      throw err;
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllNotification,
  createNotification,
  toggleNotificationStatus,
  deleteNotification,
};
