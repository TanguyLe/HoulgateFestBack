let { sendServerError } = require("./errors");

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const CAPTCHA_FAILED_MSG = "La vérification anti-robot a échoué, réessaie.";

if (!process.env.TURNSTILE_SECRET_KEY)
    console.warn("TURNSTILE_SECRET_KEY is not set: sign ups and contact messages will be refused");

// Checks the Cloudflare Turnstile token the sign up and contact forms send, so bots can't create
// accounts or send mails.
// Tokens are single use and expire after 5 minutes: the front gets a new one after each attempt
exports.verify = (req, res, next) => {
    let token = req.body.captcha;
    if (typeof token !== "string" || !token)
        return res.status(400).json({ errors: { captcha: { message: CAPTCHA_FAILED_MSG } } });

    fetch(SITEVERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            secret: process.env.TURNSTILE_SECRET_KEY,
            response: token,
            remoteip: req.ip,
        }),
        signal: AbortSignal.timeout(10 * 1000),
    })
        .then((response) => response.json())
        .then((outcome) => {
            if (!outcome.success) {
                console.log("Captcha refused: " + outcome["error-codes"]);
                return res
                    .status(400)
                    .json({ errors: { captcha: { message: CAPTCHA_FAILED_MSG } } });
            }

            next();
        })
        .catch((err) => sendServerError(res, err));
};
