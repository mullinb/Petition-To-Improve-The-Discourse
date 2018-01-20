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


router.get('/', user.requireLogin, (req, res) => {
    dtb.getUserProfile(req.session.user.userId)
    .then((results) => {
        res.render('userprofile', {
            profile: results,
            hasSigned: req.session.hasSigned,
            csrfToken: req.csrfToken(),
            manageLink: true
        });
    })
})

router.post('/', user.requireLogin, (req, res) => {
    dtb.updateUserProfile(req.body, req.session.user.userId)
        .then((results) => {
            res.redirect('/userprofile/updated');
            myRedis.deleteCacheSigs();
        })
        .catch((err) => {
            res.redirect('userprofile');
        })
})

router.get('/updated', user.requireLogin, (req, res) => {
    dtb.getUserProfile(req.session.user.userId)
    .then((results) => {
        res.render('userprofile', {
            updated: true,
            message: "Thanks for updating your profile",
            profile: results,
            hasSigned: req.session.hasSigned,
            csrfToken: req.csrfToken(),
            manageLink: true
        });
    })
});

router.get("/manage", user.requireLogin, (req, res) => {
    console.log(req.session.user.userId);
    dtb.getUserProfile(req.session.user.userId)
    .then((results) => {
        res.render('manageprofile', {
            profile: results,
            hasSigned: req.session.hasSigned,
            csrfToken: req.csrfToken()
        });
    })
});

router.post("/manage", user.requireLogin, dtb.allRegisterFieldsManage, (req, res) => {
    Promise.all([
        dtb.updateUserProfile(req.body, req.session.user.userId),
        dtb.updateUser(req.body, req.session.user.userId)
    ])
    .then(() => {
        return dtb.getUserProfile(req.session.user.userId)
    })
    .then((results) => {
        return user.attachUpdatedInfo(results, req, res)
    })
    .then((results) => {
        myRedis.deleteCacheSigs(); //Also deleting within the individual update functions above, in case either fails.
        res.render('manageprofile', {
            message: "Thanks for updating your profile!",
            profile: results,
            hasSigned: req.session.hasSigned,
            csrfToken: req.csrfToken()
        });
    })
    .catch(err => console.log(err))
});

router.get("/password", user.requireLogin, (req, res) => {
    dtb.getUserProfile(req.session.user.userId)
    .then((results) => {
        res.render('password', {
            manageLink: true,
            profile: results,
            hasSigned: req.session.hasSigned,
            csrfToken: req.csrfToken()
        });
    })
});

router.post("/password", user.requireLogin, (req, res) => {
    dtb.checkAndUpdatePassword(req, res)
    .catch((err) => {
        console.log(err);
    })
})
