const User = require('../models/userModel')
const {hashPassword, verifyPassword} = require('../crypto/hash')

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/auth/login')
    })
}

exports.loginForm = (req, res) => {
    res.render('pages/auth/login')
}

exports.login = (req, res) => {
    User.findUserByLogin(req.body.login, (err, user) => {
        if (err || !user) return res.redirect('/auth/login')

        if (!verifyPassword(req.body.password, user.password)) {
            return res.redirect('/auth/login')
        }

        req.session.user = {
            id: user.id,
            login: user.login
        }

        res.redirect('/')
    });
}

exports.registerForm = (req, res) => {
    res.render('pages/auth/register')
}

exports.register = (req, res) => {
    User.findUserByLogin(req.body.login, (err, existing) => {
        if (err || existing) return res.redirect('/auth/register')

        User.createUser({
            login: req.body.login,
            password: hashPassword(req.body.password),
            money: 0
        }, (err, user) => {
            if (err) {
                console.error('Error creating user:', err);
                return res.redirect('/auth/register');
            }
            res.redirect('/auth/login')
        });
    });
}