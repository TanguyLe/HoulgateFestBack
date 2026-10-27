// Health checks hit these every few seconds: logging them would drown the useful lines
const QUIET_PATHS = ["/", "/status"];

// One line per request, once it's answered: method, path, status, duration and the connected user.
// The query string is left out since activation and password reset links carry their codes there.
exports.requestLogger = (req, res, next) => {
    const start = process.hrtime.bigint();

    res.on("finish", () => {
        if (QUIET_PATHS.includes(req.path) && res.statusCode < 400) return;

        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        const user = req.user ? req.user.username : "-";
        const line = `${req.method} ${req.path} ${res.statusCode} ${durationMs.toFixed(0)}ms user=${user} ip=${req.ip}`;

        if (res.statusCode >= 500) console.error(line);
        else if (res.statusCode >= 400) console.warn(line);
        else console.log(line);
    });

    next();
};

// Errors passed to next() or thrown by a handler, e.g. a malformed JSON body. Without this, Express
// answers an HTML page, with the stack trace outside of production.
exports.errorHandler = (err, req, res, next) => {
    if (res.headersSent) return next(err);

    const status = err.status || err.statusCode || 500;
    if (status >= 500) {
        console.error(`Unhandled error on ${req.method} ${req.path}:`, err);
        return res.status(500).send({ message: "Internal server error" });
    }

    console.warn(`${req.method} ${req.path} rejected: ${err.message}`);
    res.status(status).send({ message: err.expose ? err.message : "Bad request" });
};

// Async errors nobody caught would otherwise only show as a terse warning, or kill the process silently
exports.logProcessErrors = () => {
    process.on("unhandledRejection", (reason) =>
        console.error("Unhandled promise rejection:", reason),
    );
    process.on("uncaughtException", (err) => {
        console.error("Uncaught exception, exiting:", err);
        process.exit(1);
    });
};
