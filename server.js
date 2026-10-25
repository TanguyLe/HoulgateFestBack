let express = require("express"),
    cors = require("cors"),
    bodyParser = require("body-parser"),
    app = express(),
    port = process.env.PORT || 3000,
    User = require("./api/user/userModel"),
    Room = require("./api/room/roomModel"),
    Shotgun = require("./api/shotgun/shotgunModel"),
    Edition = require("./api/edition/editionModel"),
    middleware = require("./api/utils/middleware"),
    rateLimits = require("./api/utils/rateLimits"),
    scriptsUtils = require("./scripts/scriptsUtils"),
    statusRoutes = require("./api/status/statusRoutes"),
    userRoutes = require("./api/user/userRoutes"),
    userRoutesWithAuth = require("./api/user/userRoutesWithAuth"),
    editionRoutes = require("./api/edition/editionRoutes"),
    roomRoutes = require("./api/room/roomRoutes"),
    shotgunRoutes = require("./api/shotgun/shotgunRoutes"),
    contactRoutes = require("./api/contact/contactRoutes"),
    timeRoutes = require("./api/time/timeRoutes");

scriptsUtils.connectToDb(scriptsUtils.getMongoDbUriFromEnv());

// Only the front may call the API from a browser: without FRONT_HOST, no cross-origin call is allowed
if (!process.env.FRONT_HOST)
    console.warn("FRONT_HOST is not set: cross-origin requests are refused");
app.use(
    cors({ origin: process.env.FRONT_HOST ? process.env.FRONT_HOST.replace(/\/$/, "") : false })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Behind Vercel's proxy: trust its X-Forwarded-For so rate limits apply to the client IP
app.set("trust proxy", 1);
app.post("/login", rateLimits.login);
app.post("/users", rateLimits.signUp);
app.post("/passwordReset", rateLimits.passwordReset);
app.post("/contact", rateLimits.contact);

statusRoutes(app);
userRoutes(app);
contactRoutes(app);
timeRoutes(app);
app.use(middleware.userAuth);
userRoutesWithAuth(app);
editionRoutes(app);
app.use(middleware.hasStarted);
roomRoutes(app);
shotgunRoutes(app);

app.use(middleware.notFound);

app.listen(port, () => console.log("HoulgateFestBack server started on: " + port));
