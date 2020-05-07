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
                message: err.message || "An error occurred while retrieving trips."
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
                message: err.message || "An error occurred while creating a trip."
            });
        });
};


const updateTrip = (req, res) => {
    tripController.updateTrip(req.params.tripId, req.body,
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
                message: err.message || `An error occurred while updating trip:${req.params.tripId}`
            });
        });
};

const deleteTrip = (req, res) => {
    tripController.deleteTrip(req.params.tripId,
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
                message: err.message || `An error occurred while deleting trip:${req.params.tripId}`
            });
        });
};


module.exports = (app) => {
    app.route('/trip')
        .get(getTrips)
        .post(createTrip);

    app.route("/trip/:tripId")
        .put(updateTrip)
        .delete(deleteTrip);
};
