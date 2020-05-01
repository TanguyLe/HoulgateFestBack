let tripController = require('./tripController');

const getTrips = (req, res) => {
    tripController.getTrips(trips => {
            res.status(200).send({
                meta: {
                    code: "200"
                },
                data: trips
            })
        },
        err => {
            res.status(500).send({
                message: err.message || "Some error occurred while retrieving trips."
            });
        });
};

module.exports = (app) => {
    app.route('/trip')
        .get(getTrips);
};
