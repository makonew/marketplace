
const router = require('express').Router()
const controller = require('../controllers/authController')


router.use('/auth', require('./authRouter'));

router.get('/', (req,res) => res.redirect("/auth/login"))

module.exports = router