let editionController = require("./editionController"),
    { sendServerError } = require("../utils/errors");

const getEditions = (req, res) => {
    editionController.getEditions(
        (editions) => {
            res.status(200).send({
                meta: {
                    code: "200",
                },
                data:
                    req.query.current !== undefined
                        ? req.query.current
                            ? editionController.getCurrentEditionFromEditions(editions)
                            : editions
                        : editions,
            });
        },
        (err) => sendServerError(res, err),
    );
};

module.exports = (app) => {
    app.route("/edition").get(getEditions);
};
