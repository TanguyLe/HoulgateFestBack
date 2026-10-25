let bcrypt = require("bcrypt");

// bcrypt ignores everything past 72 bytes, so longer passwords are refused rather than truncated
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;

exports.PASSWORD_POLICY_MSG = `Le mot de passe doit faire entre ${MIN_PASSWORD_LENGTH} et ${MAX_PASSWORD_BYTES} caractères.`;

exports.isValidPassword = (password) =>
    typeof password === "string" &&
    password.length >= MIN_PASSWORD_LENGTH &&
    Buffer.byteLength(password) <= MAX_PASSWORD_BYTES;

exports.cryptPassword = (plainTextPassword) => {
    return bcrypt.hash(plainTextPassword, 10);
};

exports.comparePassword = (plainTextPassword, hash) => {
    return bcrypt.compare(plainTextPassword, hash);
};

exports.cryptPasswordSync = (plainTextPassword) => {
    return bcrypt.hashSync(plainTextPassword, 10);
};

exports.comparePasswordSync = (plainTextPassword, hash) => {
    return bcrypt.compareSync(plainTextPassword, hash);
};
