function logger(req, res, next) {
    console.log("middleware ran");
    next();
}

module.exports = logger;