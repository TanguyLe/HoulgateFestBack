let admin = require("./adminController"),
    middleware = require("../utils/middleware"),
    timeout = require("../shotgun/shotgunController/timeoutController");

// Mounted after the user authentication: every admin route also needs an admin user
module.exports = (app) => {
    app.use("/admin", middleware.adminAuth);

    app.route("/admin/users").get(admin.userList);
    app.route("/admin/users/:userId").put(admin.updateUser);
    app.route("/admin/users/:userId/activationEmail").post(admin.sendActivationEmail);

    // Same cleanup as the shotgun routes, so expired pre-shotguns are neither shown nor edited
    app.use("/admin/shotguns", timeout.expireStaleShotguns);
    app.route("/admin/shotguns").get(admin.shotgunList);
    app.route("/admin/shotguns/historize").post(admin.historizeShotguns);
    app.route("/admin/shotguns/:shotgunId").put(admin.updateShotgun).delete(admin.deleteShotgun);

    app.route("/admin/editions").get(admin.editionList).post(admin.createEdition);
    app.route("/admin/editions/:editionId").put(admin.updateEdition).delete(admin.deleteEdition);
};
