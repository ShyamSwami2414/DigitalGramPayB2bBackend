const FundRequest = require("../../models/fundRequestModel");

exports.fundRequestStats = async (req, res) => {
  try {

    const result = await FundRequest.aggregate([
      {
        $match: { isDeleted: false }
      },
      {
        $group: {
          _id: null,
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
          },
          approved: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
          },
          total: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          pending: 1,
          approved: 1,
          rejected: 1,
          total: 1
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      message: "Fund requests stats fetched successfully",
      data: result[0] || { pending: 0, approved: 0, rejected: 0, total: 0 }
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
}

exports.getAllFundRequests = async (req, res) => {
    try {
        let { page = 1, limit = 10, status = "", search = "" } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        status = status.trim();
        search = search.trim();
        const skip = (page - 1) * limit;

        const filter = { isDeleted: false };
        if (status) {
            filter.status = status.toLowerCase();
        }

        const fundRequests = await FundRequest.find(filter).
            sort({ createdAt: -1 }).
            skip(skip).
            limit(limit).
            lean()

        const total = await FundRequest.countDocuments(filter)

        return res.status(200).json({
            success: true,
            message: "Fund requests fetched successfully",
            data: fundRequests,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error
        })

    }
}