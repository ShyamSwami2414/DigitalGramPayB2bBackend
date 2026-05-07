const Document = require("../../models/documentModel")

exports.getAllDocumentOptionList = async (req, res, next) => {
    try {
        const documentList = await Document.find().select("key label");

        return res.status(200).json({
            success: true,
            message: "Document List Fetched",
            data: documentList
        })

    } catch (error) {
        next(error)
    }

}