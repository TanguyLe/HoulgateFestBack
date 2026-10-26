let mongoose = require("mongoose"),
    User = mongoose.model("Users"),
    Edition = mongoose.model("Edition"),
    Shotgun = mongoose.model("Shotguns"),
    Room = mongoose.model("Rooms"),
    historizeController = require("../shotgun/shotgunController/historizeController"),
    timeout = require("../shotgun/shotgunController/timeoutController"),
    { freeUsers } = require("../shotgun/shotgunController/shotgunUsersController"),
    userActivator = require("../user/userActivator"),
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

// Ids sent in a body: isValidObjectId would also accept any 12 characters string
const isObjectId = (value) => typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);

// An error answered as is to the admin, with its status
const adminError = (status, message) => Object.assign(new Error(message), { status: status });

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
                    JSON.stringify(update),
            );
            return findUsers({ _id: req.params.userId }).then((users) => sendData(res, users[0]));
        })
        .catch((err) => sendServerError(res, err));
};

// Sends a new activation link to a user who lost theirs (the previous links stay valid)
exports.sendActivationEmail = (req, res) => {
    if (!mongoose.isValidObjectId(req.params.userId)) return sendInvalidId(res);

    User.findById(req.params.userId)
        .then((user) => {
            if (!user) return res.status(404).send({ message: "Utilisateur introuvable." });
            if (user.activated)
                return res.status(400).send({ message: "Ce compte est déjà activé." });

            // Without it activator would read the id from req.user, which only holds the token
            req.activator = { id: user.id };
            // The "Next" handlers of activator always call next(): the outcome is in req.activator
            userActivator.activator.createActivateNext(req, res, () => {
                if (req.activator.code !== 201) {
                    console.error("Activation email to " + user.email + " failed:", req.activator);
                    return res
                        .status(502)
                        .send({ message: "L'email d'activation n'a pas pu être envoyé." });
                }

                console.log(
                    "Admin " + req.admin.email + " resent the activation email to " + user.email,
                );
                sendData(res, { email: user.email });
            });
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

const populateShotgun = (query) =>
    query
        .populate("room", "text nbBeds")
        .populate("user", "username")
        .populate("roommates", "username");

// The current shotguns, and how many shotguns each edition already has in the history
exports.shotgunList = (req, res) => {
    Promise.all([
        populateShotgun(Shotgun.find({}, { __v: 0 })),
        historizeController.getHistoryCounts(),
    ])
        .then(([shotguns, historyCounts]) =>
            sendData(res, {
                shotguns: shotguns,
                historyCounts: historyCounts.reduce((counts, count) => {
                    counts[count._id] = count.count;
                    return counts;
                }, {}),
            }),
        )
        .catch((err) => sendServerError(res, err));
};

exports.historizeShotguns = (req, res) => {
    if (!mongoose.isValidObjectId(req.body.editionId)) return sendInvalidId(res);

    Edition.findById(req.body.editionId)
        .then((edition) => {
            if (!edition) return res.status(404).send({ message: "Édition introuvable." });

            return historizeController.historizeShotguns(edition).then((result) => {
                console.log(
                    "Admin " +
                        req.admin.email +
                        " historized the shotguns of " +
                        edition.year +
                        ": " +
                        JSON.stringify(result),
                );
                sendData(res, result);
            });
        })
        .catch((err) => sendServerError(res, err));
};

// Deletes a shotgun or a pre-shotgun and frees its room and all its users
exports.deleteShotgun = (req, res) => {
    if (!mongoose.isValidObjectId(req.params.shotgunId)) return sendInvalidId(res);

    Shotgun.findByIdAndDelete(req.params.shotgunId)
        .then((shotgun) => {
            if (!shotgun) return res.status(404).send({ message: "Shotgun introuvable." });

            timeout.clearShotgunTimeout(shotgun);
            return freeUsers([shotgun.user, ...shotgun.roommates], shotgun.room).then((reset) => {
                console.log(
                    "Admin " +
                        req.admin.email +
                        " deleted the " +
                        shotgun.status +
                        " shotgun " +
                        shotgun._id +
                        " of room " +
                        shotgun.room,
                );
                sendData(res, { usersReset: reset.modifiedCount });
            });
        })
        .catch((err) => sendServerError(res, err));
};

// Replaces the owner and the roommates of a shotgun, keeping its status. A pre-shotgun has no
// roommates yet: only its owner can be changed. The new users must be activated and free: an admin
// moving someone from another room deletes or edits that other shotgun first.
exports.updateShotgun = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.shotgunId)) return sendInvalidId(res);

    const { user, roommates } = req.body;
    if (!isObjectId(user) || !Array.isArray(roommates) || !roommates.every(isObjectId))
        return res
            .status(400)
            .send({ message: "Un propriétaire et une liste de colocataires sont requis." });

    const members = [user, ...roommates];
    if (new Set(members).size !== members.length)
        return res.status(400).send({ message: "Une même personne apparaît deux fois." });

    try {
        const shotgun = await Shotgun.findById(req.params.shotgunId);
        if (!shotgun) throw adminError(404, "Shotgun introuvable.");

        if (shotgun.status === "preShotgunned" && roommates.length)
            throw adminError(
                400,
                "Un pré-shotgun n'a pas de colocataires : seul le propriétaire peut être changé.",
            );

        const room = await Room.findById(shotgun.room);
        if (!room) throw adminError(404, "Chambre introuvable.");
        if (members.length > room.nbBeds)
            throw adminError(
                400,
                "La chambre " + room.text + " n'a que " + room.nbBeds + " lit(s).",
            );

        const users = await User.find({ _id: { $in: members } }, { username: 1, activated: 1 });
        if (users.length !== members.length) throw adminError(404, "Utilisateur introuvable.");

        const notActivated = users.filter((u) => !u.activated);
        if (notActivated.length)
            throw adminError(
                400,
                "Compte(s) non activé(s) : " + notActivated.map((u) => u.username).join(", ") + ".",
            );

        const others = await Shotgun.find({
            _id: { $ne: shotgun._id },
            $or: [{ user: { $in: members } }, { roommates: { $in: members } }],
        });
        const otherMembers = new Set(
            others.flatMap((other) => [other.user, ...other.roommates]).map(String),
        );
        const busy = users.filter((u) => otherMembers.has(String(u._id)));
        if (busy.length)
            throw adminError(
                409,
                "Déjà dans une autre chambre : " +
                    busy.map((u) => u.username).join(", ") +
                    ". Modifie ou supprime d'abord ce shotgun.",
            );

        const removed = [shotgun.user, ...shotgun.roommates].filter(
            (member) => !members.includes(String(member)),
        );

        shotgun.user = user;
        shotgun.roommates = roommates;
        await shotgun.save();

        await freeUsers(removed, room._id);
        await User.updateOne(
            { _id: user },
            {
                $set: {
                    hasShotgun: shotgun.status === "shotgunned",
                    hasPreShotgun: true,
                    room: room._id,
                },
            },
        );
        await User.updateMany(
            { _id: { $in: roommates } },
            { $set: { hasShotgun: true, hasPreShotgun: false, room: room._id } },
        );

        console.log(
            "Admin " +
                req.admin.email +
                " updated the shotgun of room " +
                room.text +
                ": owner " +
                user +
                ", roommates " +
                JSON.stringify(roommates),
        );
        sendData(res, await populateShotgun(Shotgun.findById(shotgun._id, { __v: 0 })));
    } catch (err) {
        if (err.status) return res.status(err.status).send({ message: err.message });
        // The unique index on the owner: a concurrent shotgun got the new owner first
        if (err.code === 11000)
            return res.status(409).send({ message: "Ce propriétaire a déjà un shotgun." });

        sendServerError(res, err);
    }
};
