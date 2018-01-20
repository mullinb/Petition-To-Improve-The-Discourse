const express = require('express');
const router = express.Router();
module.exports = router;

const csurf = require('csurf');
const hb = require('express-handlebars');
let spicedPg = require('spiced-pg');
const dtb = require('../models/database.js');
const user = require('../models/user.js')
let myRedis = require("../myRedis");
var session = require('express-session');
var Store = require('connect-redis')(session);

let dbUrl = process.env.DATABASE_URL || `postgres:${require('../secrets').dbUser}@localhost:5432/petitionITD`;

let db = spicedPg(dbUrl);


router.get('/register', user.requireLogout, (req, res) => {
    try {
        if (!req.session.hasSigned & !req.session.user.loggedIn) {
            res.render('register', {
                csrfToken: req.csrfToken()
            });
        } else if (req.session.hasSigned && req.session.user.loggedIn) {
            res.redirect('/signatures/thanks');
        } else if (!req.session.hasSigned && req.session.user.loggedIn) {
            res.redirect('/sign');
        }
    } catch (e) {
        res.render('register', {
            csrfToken: req.csrfToken()
        });
    }
})

router.post('/register', user.allRegisterFields, user.requireLogout, (req, res) => {
    dtb.registerUser(req.body)
        .then((userId) => {
            user.attachRegistrationInfo(userId, req, res);
            res.redirect('/userprofile');
        })
        .catch((err) => {
            console.log(err);
            res.render('register', {
                errorMessage: "That email is already taken, please try another!",
                csrfToken: req.csrfToken()
            })
        })
})

router.get('/login', user.requireLogout, (req, res) => {
    res.render('login', {
        csrfToken: req.csrfToken()
    });
})


router.post('/login', (req, res) => {
    console.log("FIRST")
    dtb.loginUser(req.body)
    .then((results) => {
        console.log("FIFTH");
        myRedis.deleteHackRecords(req);
        user.attachLoginInfo(results, req, res);
        res.redirect('/');
    })
    .catch((err) => {
        if (err.message === "bad email") {
            res.render('login', {
                csrfToken: req.csrfToken(),
                errorMessage: "No account with that email address exists!"
            });
        } else if (err.message === "bad pass") {
            myRedis.antiHack(req, res);
        } else {
            console.log("second else")
            res.render('login', {
                csrfToken: req.csrfToken(),
                errorMessage: "Something went wrong, please try again."
            });
        }
    });
})
