exports.refillUserWallet = async (req, res, next) => {
  try {
    return res.status(200).json({ success: true, message: "Done" });
  } catch (error) {
    next(error);
  }
};
