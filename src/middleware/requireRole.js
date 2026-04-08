module.exports = role => (req, res, next) => {
    if (req.session.user.role !== role) return res.status(403).send('Forbidden')
    next();
}