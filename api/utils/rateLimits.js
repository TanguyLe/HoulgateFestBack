let rateLimit = require("express-rate-limit").rateLimit;

const MINUTE = 60 * 1000;

let limiter = (windowMs, limit) =>
    rateLimit({
        handler: (req, res, next, options) => {
            console.warn(`Rate limit hit on ${req.method} ${req.path} by ${req.ip}`);
            res.status(options.statusCode).send(options.message);
        },
        windowMs: windowMs,
        limit: limit,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message: { message: "Trop de requêtes, réessaie dans quelques minutes." },
    });

// Limits are per IP and generous enough for a group sharing a network on shotgun day
exports.login = limiter(15 * MINUTE, 30);
exports.signUp = limiter(60 * MINUTE, 10);
exports.passwordReset = limiter(60 * MINUTE, 10);
exports.contact = limiter(60 * MINUTE, 5);
