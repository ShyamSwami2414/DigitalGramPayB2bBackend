const WalletLedger = require("../../models/walletLedgerModel");
const { paiseToRupee } = require("../../utils/money");

exports.globalTransactionSearch = async (req, res, next) => {
  try {
    let { referenceId } = req.query;
    referenceId = referenceId?.trim();

    if (!referenceId) {
      return res
        .status(400)
        .json({ success: false, message: "Transaction Reference ID required" });
    }

    const result = await WalletLedger.aggregate([
      { $match: { referenceId: referenceId } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },

      {
        $lookup: {
          from: "transactions",
          let: {
            refId: "$referenceId",
            uid: "$userId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$referenceId", "$$refId"],
                    },
                    {
                      $eq: ["$userId", "$$uid"],
                    },
                  ],
                },
              },
            },

            {
              $project: {
                _id: 0,
                status: 1,
              },
            },
          ],
          as: "transaction",
        },
      },

      {
        $unwind: {
          path: "$transaction",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          fullName: {
            $concat: ["$user.firstName", " ", "$user.lastName"],
          },

          userName: "$user.userName",
          email: "$user.email",
          phone: "$user.phone",
          isActive: "$user.isActive",
          serviceType: 1,
          wallet: 1,
          type: 1,
          amount: 1,
          openingBalance: 1,
          closingBalance: 1,
          referenceId: 1,
          description: 1,
          createdAt: 1,
          status: "$transaction.status",
        },
      },
    ]);

    if (result.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No Data available for this transaction ID",
        data: [],
      });
    }

    const formattedData = result.map((item) => ({
      ...item,
      amount: paiseToRupee(item?.amount),
      openingBalance: paiseToRupee(item?.openingBalance),
      closingBalance: paiseToRupee(item?.closingBalance),
    }));

    return res.status(200).json({
      success: true,
      message: "Transaction Found",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};
