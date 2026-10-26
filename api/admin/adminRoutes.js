let admin = require("./adminController"),
    middleware = require("../utils/middleware");

// Mounted after the user authentication: every admin route also needs an admin user
module.exports = (app) => {
    app.use("/admin", middleware.adminAuth);

    app.route("/admin/users").get(admin.userList);
    app.route("/admin/users/:userId").put(admin.updateUser);

    app.route("/admin/editions").get(admin.editionList).post(admin.createEdition);
    app.route("/admin/editions/:editionId").put(admin.updateEdition).delete(admin.deleteEdition);
};
