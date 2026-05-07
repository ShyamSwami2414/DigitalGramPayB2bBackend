const StateCity = require("../../models/stateCityModel");

const getAllStatesList = async (req, res, next) => {
  try {
    const states = await StateCity.aggregate([
      { $match: {} },
      {
        $group: {
          _id: "$stateCode",
          stateName: { $first: "$stateName" },
        },
      },
      {
        $project: {
          _id: 0,
          stateCode: "$_id",
          stateName: 1,
        },
      },
      {
        $sort: {
          stateName: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "State List Fetched",
      data: states,
    });
  } catch (error) {
    next(error);
  }
};

const getStateWiseCityList = async (req, res, next) => {
  try {
    let { code } = req.query;

    console.log("RAW QUERY:", req.query);
    console.log("CODE VALUE:", req.query.code);
    console.log("TYPE:", typeof req.query.code);

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "State Code is required",
      });
    }

    code = Number(code.trim());

    if (isNaN(code)) {
      return res.status(400).json({
        success: false,
        message: "Invalid State Code",
      });
    }

    console.log(code, typeof code);

    const cities = await StateCity.find({ stateCode: code })
      .select("cityName")
      .lean();

    if (cities.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No city available for this code",
        data: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "City List Fetched",
      data: cities,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllStatesList, getStateWiseCityList };
