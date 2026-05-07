const Notification = require("../../models/notificationModel");

const getAllNotification = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      isActive: true,
      isDeleted: false,
    })
      .sort({
        createdAt: -1,
      })
      .select("name")
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

module.exports = { getAllNotification };
