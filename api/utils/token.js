let crypto = require("crypto"),
    jwt = require("jsonwebtoken");

let secret = process.env.REFRESH_TOKEN_SECRET;
let refreshTokens = {};

let randomToken = () => {
    return crypto.randomBytes(32).toString("hex");
};

exports.getJWTToken = (headers) => {
    if (!headers.authorization) return false;

    let split = headers.authorization.split(" ");

    if (split[0] !== "JWT") return false;

    return split[1];
};

exports.generateAccessToken = (info = "random_shit") => {
    return jwt.sign(info, secret, { expiresIn: "20m" });
};

exports.generateRefreshToken = (accessToken) => {
    if (refreshTokens[accessToken]) return refreshTokens[accessToken];

    let refreshToken = randomToken();

    refreshTokens[accessToken] = refreshToken;

    return refreshToken;
};

exports.checkAccessToken = (accessToken, callbackFct, ignoreExpiration) => {
    jwt.verify(accessToken, secret, { ignoreExpiration: ignoreExpiration }, callbackFct);
};

exports.checkIfAccessTokenExpired = (accessToken) => {
    return Date.now() / 1000 > jwt.decode(accessToken).exp;
};

exports.checkRefreshToken = (accessToken, refreshToken) => {
    if (refreshTokens[accessToken] && refreshTokens[accessToken] === refreshToken) {
        delete refreshTokens[accessToken];

        return true;
    }

    return false;
};

exports.secret = secret;
