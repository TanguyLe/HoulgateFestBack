// activator's req.param() calls req.params.hasOwnProperty, which Express 5's prototype-less params lack
const plainParams = (req, res, next) => {
    req.params = { ...req.params };
    next();
};

module.exports = (app) => {
    let user = require("./userController"),
        userActivator = require("./userActivator");

    userActivator.activator.init(userActivator.config);

    app.route("/users").post(
        user.createUser,
        userActivator.activator.createActivateNext,
        user.createActivateHandler,
    );

    app.route("/users/:user/activate").get(
        plainParams,
        userActivator.activator.completeActivateNext,
        user.afterCompleteActivation,
    );

    app.route("/users/:user/passwordReset").put(
        plainParams,
        userActivator.activator.completePasswordResetNext,
        user.afterCompletePasswordReset,
    );

    app.route("/passwordReset").post(
        user.beforeCreatePasswordReset,
        plainParams,
        userActivator.activator.createPasswordResetNext,
        user.afterCreatePasswordReset,
    );

    app.route("/login").post(user.login);

    app.route("/refreshLogin").post(user.refreshLogin);
};
