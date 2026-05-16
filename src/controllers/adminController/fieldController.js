const Field = require("../../models/fieldModel")

exports.getAllFieldOptionList = async (req, res, next) => {
    try {

        const fieldList = await Field.find().select("key label");

        return res.status(200).json({
            success: true,
            message: "Field List Fetched",
            data: fieldList
        })

    } catch (error) {
        next(error)
    }
}