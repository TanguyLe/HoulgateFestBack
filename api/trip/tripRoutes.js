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
            res.status(err.code || 500).send({
                message: err.message || "Some error occurred while retrieving trips."
            });
        });
};

const createTrip = (req, res) => {
    tripController.createTrip(req.body,
        trip => {
            res.status(200).send({
                meta: {
                    code: "200"
                },
                data: trip
            })
        },
        err => {
            res.status(err.code || 500).send({
                message: err.message || "Some error occurred while creating a trip."
            });
        });
};


module.exports = (app) => {
    app.route('/trip')
        .get(getTrips)
        .post(createTrip);
};
