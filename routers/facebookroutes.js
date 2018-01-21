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
let fb = require('../models/facebook.js');

let dbUrl = process.env.DATABASE_URL || `postgres:${require('../secrets').dbUser}@localhost:5432/petitionITD`;

let db = spicedPg(dbUrl);

router.post("/arrive", (req, res) => {
    let fbUser;
    if (req.body.fbAccessToken) {
        fb.API(req.body.fbAccessToken)
        .then((results) => {
            fbUser = results;
            console.log("should have a result below")
            console.log(fbUser.id);
            return fb.registerOrLogin(results);
        })
        .then((result) => {
            if (result) {
                fb.getFBUserProfile(fbUser.id)
                .then((results) => {
                    return Promise.all([
                        user.attachLoginInfo(results, req, res),
                        dtb.existsSingleSig(results.rows[0].id, req, res)
                    ])
                })
                .then(() => {
                    res.json({
                        redirect: '/facebook/loggedIn'
                    })
                    res.end();
                })
            } else {
                if (fbUser.email) {
                    fb.registerFacebookUser(fbUser)
                    .then((results) => {
                        user.attachRegistrationInfo(results, req, res);
                        res.json({
                            redirect: '/facebook/loggedIn'
                        })
                        res.end();
                    }).catch((err) => {
                        console.log(err);
                        res.render('register', {
                            errorMessage: "The email associated with your facebook account is already registered, please login with it or try another!",
                            csrfToken: req.csrfToken()
                        })
                    })
                } else {
                    fb.attachNoEmailInfo(fbUser, req, res);
                    res.json({
                        redirect: "/facebook/noEmail"
                    })
                    res.end();
                }
            }
        })
        .catch((err) => {
            console.log(err);
            res.redirect("invalid");
        })
    }
})

router.get("/noEmail", (req, res) => {
    res.render("noEmail", {
        csrfToken: req.csrfToken(),
        firstName: req.session.user.firstName,
        lastName: req.session.user.lastName
    })
})

router.post("/noEmail", user.requireEmail, (req, res) => {
    fb.registerNoEmailUser(req.session.user, req.body.EmailAddress)
    .then(() => {
        fb.getFBUserProfile(req.session.user.fbId)
    })
    .then((results) => {
        req.session.user = {
            emailAddress: results[0].rows[0].email,
            userId: results[0].rows[0].id
        }
    })
    .then(() => {
        res.redirect('/facebook/loggedIn');
    })
    .catch((err) => {
        console.log(err);
        res.render("invalid", {
            errorMessage: "no idea",
            manageLink: true
        })
    })
})

router.get("/loggedIn", (req, res) => {
    console.log(req.session.user);
    res.render("loggedInFb", {
        firstName: req.session.user.firstName,
        lastName: req.session.user.lastName
    });
})
