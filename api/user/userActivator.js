let mongo = require("mongodb"),
    mongoose = require("mongoose"),
    nodemailer = require("nodemailer"),
    activator = require("activator"),
    User = mongoose.model("Users"),
    passwordUtils = require("../utils/password"),
    tokenUtils = require("../utils/token"),
    mailConfig = require("../mail/mailConfig");

exports.activator = activator;

exports.config = {
    user: {
        find: (id, callback) => {
            User.findById(id)
                .then((user) => {
                    if (!user) callback(null, null);
                    else {
                        let res = { id: user.id, email: user.email };

                        callback(null, res);
                    }
                })
                .catch((err) => {
                    console.error(err)
                    callback(err, null);
                });
        },
        activate: (id, callback) => {
            User.updateOne(
                { _id: new mongo.ObjectId(id) },
                { $set: { activated: true } }
            )
            .then((obj) => {
                callback(null,obj);
            })
            .catch((err) => {
                console.error(err)
                callback(err, null);
            });
        },
        setPassword: (id, password, callback) => {
            passwordUtils.cryptPassword(password).then((resPassword) => {
                User.updateOne(
                    { _id: new mongo.ObjectId(id) },
                    { $set: { password: resPassword } },
                    )
                    .then((obj) => {
                        callback(null,obj);
                    })
                    .catch((err) => {
                        callback(err, null);
                    });
            });
        },
    },
    emailProperty: "email",
    signkey: tokenUtils.secret,
    from: "houlgatefest@gmail.com",
    transport: nodemailer.createTransport(mailConfig),
    templates: activator.templates.file(__dirname + "/templates"),
};
