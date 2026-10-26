let mongoose = require("mongoose"),
    User = mongoose.model("Users"),
    Edition = mongoose.model("Edition"),
    { sendServerError } = require("../utils/errors");

// Only these fields can be changed from the admin interface: emails and usernames stay the users'
// own, and the shotgun state (hasShotgun, room...) is only changed by the shotgun routes
const EDITABLE_USER_FIELDS = ["activated", "isAdmin"];
const EDITION_FIELDS = ["year", "weekendDate", "shotgunDate"];

const pick = (body, fields) =>
    fields.reduce((picked, field) => {
        if (body[field] !== undefined) picked[field] = body[field];
        return picked;
    }, {});

const sendData = (res, data, status = 200) =>
    res.status(status).send({ meta: { code: String(status) }, data: data });

const sendInvalidId = (res) => res.status(400).send({ message: "Identifiant invalide." });

const sendEditionError = (res, err) => {
    if (err.name === "ValidationError" || err.name === "CastError")
        return res
            .status(400)
            .send({ message: "Édition invalide : l'année et les deux dates sont requises." });

    if (err.code === 11000)
        return res.status(409).send({ message: "Une édition existe déjà pour cette année." });

    sendServerError(res, err);
};

// The `unique` option of the edition model doesn't build an index (MongoDB wants a boolean there),
// so the year is checked here: the current edition is looked up by year and must not be ambiguous
const saveEdition = (edition) =>
    edition
        .validate()
        .then(() => Edition.exists({ year: edition.year, _id: { $ne: edition._id } }))
        .then((duplicate) => {
            if (duplicate)
                throw Object.assign(new Error("Duplicate edition year"), { code: 11000 });
            return edition.save();
        });

const findUsers = (filter) =>
    User.find(filter, { password: 0, __v: 0 }).populate("room", "text").sort({ username: 1 });

exports.userList = (req, res) => {
    findUsers({})
        .then((users) => sendData(res, users))
        .catch((err) => sendServerError(res, err));
};

exports.updateUser = (req, res) => {
    if (!mongoose.isValidObjectId(req.params.userId)) return sendInvalidId(res);

    let update = pick(req.body, EDITABLE_USER_FIELDS);

    if (
        Object.keys(update).length === 0 ||
        Object.values(update).some((v) => typeof v !== "boolean")
    )
        return res.status(400).send({
            message:
                "Seuls les champs " +
                EDITABLE_USER_FIELDS.join(", ") +
                " (booléens) sont modifiables.",
        });

    // An admin can't lock themselves out, so there is always an admin left to undo mistakes
    if (
        req.admin.id === req.params.userId &&
        (update.activated === false || update.isAdmin === false)
    )
        return res
            .status(400)
            .send({ message: "Tu ne peux pas te désactiver ou te retirer les droits d'admin." });

    User.updateOne({ _id: req.params.userId }, { $set: update })
        .then((result) => {
            if (result.matchedCount === 0)
                return res.status(404).send({ message: "Utilisateur introuvable." });

            console.log(
                "Admin " +
                    req.admin.email +
                    " updated user " +
                    req.params.userId +
                    ": " +
                    JSON.stringify(update)
            );
            return findUsers({ _id: req.params.userId }).then((users) => sendData(res, users[0]));
        })
        .catch((err) => sendServerError(res, err));
};

exports.editionList = (req, res) => {
    Edition.find({}, { __v: 0 })
        .sort({ year: -1 })
        .then((editions) => sendData(res, editions))
        .catch((err) => sendServerError(res, err));
};

exports.createEdition = (req, res) => {
    saveEdition(new Edition(pick(req.body, EDITION_FIELDS)))
        .then((edition) => {
            console.log("Admin " + req.admin.email + " created edition " + edition.year);
            sendData(res, edition, 201);
        })
        .catch((err) => sendEditionError(res, err));
};

exports.updateEdition = (req, res) => {
    if (!mongoose.isValidObjectId(req.params.editionId)) return sendInvalidId(res);

    Edition.findById(req.params.editionId)
        .then((edition) => {
            if (!edition) return res.status(404).send({ message: "Édition introuvable." });

            edition.set(pick(req.body, EDITION_FIELDS));
            return saveEdition(edition).then((saved) => {
                console.log("Admin " + req.admin.email + " updated edition " + saved.year);
                sendData(res, saved);
            });
        })
        .catch((err) => sendEditionError(res, err));
};

exports.deleteEdition = (req, res) => {
    if (!mongoose.isValidObjectId(req.params.editionId)) return sendInvalidId(res);

    Edition.findByIdAndDelete(req.params.editionId)
        .then((edition) => {
            if (!edition) return res.status(404).send({ message: "Édition introuvable." });

            console.log("Admin " + req.admin.email + " deleted edition " + edition.year);
            sendData(res, edition);
        })
        .catch((err) => sendServerError(res, err));
};
