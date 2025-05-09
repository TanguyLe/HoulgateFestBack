let express = require("express"),
    cors = require("cors"),
    bodyParser = require("body-parser"),
    app = express(),
    port = process.env.PORT || 3000,
    User = require("./api/user/userModel"),
    Room = require("./api/room/roomModel"),
    Shotgun = require("./api/shotgun/shotgunModel"),
    Edition = require("./api/edition/editionModel"),
    Trip = require("./api/trip/tripModel"),
    middleware = require("./api/utils/middleware"),
    scriptsUtils = require("./scripts/scriptsUtils"),
    statusRoutes = require("./api/status/statusRoutes"),
    userRoutes = require("./api/user/userRoutes"),
    userRoutesWithAuth = require("./api/user/userRoutesWithAuth"),
    editionRoutes = require("./api/edition/editionRoutes"),
    roomRoutes = require("./api/room/roomRoutes"),
    shotgunRoutes = require("./api/shotgun/shotgunRoutes"),
    tripRoutes = require("./api/trip/tripRoutes"),
    contactRoutes = require("./api/contact/contactRoutes"),
    timeRoutes = require("./api/time/timeRoutes");

scriptsUtils.connectToDb(scriptsUtils.getMongoDbUriFromEnv());

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

statusRoutes(app);
userRoutes(app);
contactRoutes(app);
timeRoutes(app);
app.use(middleware.userAuth);
userRoutesWithAuth(app);
tripRoutes(app);
editionRoutes(app);
app.use(middleware.hasStarted);
roomRoutes(app);
shotgunRoutes(app);

app.use(middleware.notFound);

app.listen(port, () =>
    console.log(
        "HoulgateFestBack server started on: " +
            port +
            "\nMongoDB is: " +
            scriptsUtils.getMongoDbUriFromEnv()
    )
);
