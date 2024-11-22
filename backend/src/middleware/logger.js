function logger(req, res, next) {
    console.log('middel ware ran')
    next();
}

module.exports = logger;