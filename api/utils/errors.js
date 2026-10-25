let getObjectNotFoundError = (name, param_name, param_value) => {
    console.error("-> " + name + " not found");
    let error = new Error(name + " not found with " + param_name + " " + param_value + ".");
    error.name = "Error 404 : Not found";
    error.httpStatusCode = "404";

    return error;
};

let getServerError = (msg) => {
    let error = new Error(msg);
    error.name = "Error 500 : Internal Server Error";
    error.httpStatusCode = "500";

    return error;
};

// Logs the error and answers a generic 500, so internals (stack, DB details) aren't sent to the client
let sendServerError = (res, err) => {
    console.error(err);
    res.status(500).send({ message: "Internal server error" });
};

module.exports = {
    getObjectNotFoundError: getObjectNotFoundError,
    getServerError: getServerError,
    sendServerError: sendServerError,
};
