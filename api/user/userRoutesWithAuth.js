module.exports = (app) => {
    let user = require("./userController");

    app.route("/users").get(user.userList);

    app.route("/users/me").get(user.readMe);

    app.route("/users/:userId").get(user.readUser);
};
