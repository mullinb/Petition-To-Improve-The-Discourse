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
const querystring = require('querystring');
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
                    dtb.attachLoginInfo(results, req, res)
                })
                .then(() => {
                    res.redirect('/');
                })
            } else {
                if (fbUser.email) {
                    fb.registerFacebookUser(fbUser);
                } else {
                    fb.attachNoEmailInfo(fbUser, req, res);
                    res.redirect("/noEmail");
                }
            }
        })
        .catch((err) => {
            console.log(err);
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
        res.redirect("/")
    })
    .catch((err) => {
        console.log(err);
        res.render("invalid", {
            errorMessage: "no idea",
            manageLink: true
        })
    })
})
