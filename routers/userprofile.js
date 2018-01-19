const express = require('express');
const router = express.Router();
module.exports = router;

const csurf = require('csurf');
const hb = require('express-handlebars');
let spicedPg = require('spiced-pg');
const dtb = require('../database.js');
let myRedis = require("../myRedis");
var session = require('express-session');
var Store = require('connect-redis')(session);

let dbUrl = process.env.DATABASE_URL || `postgres:${require('../secrets').dbUser}@localhost:5432/petitionITD`;

let db = spicedPg(dbUrl);


router.get('/', dtb.requireLogin, (req, res) => {
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

router.post('/', dtb.requireLogin, (req, res) => {
    dtb.updateUserProfile(req.body, req.session.user.userId)
        .then((results) => {
            res.redirect('/userprofile/updated');
            myRedis.deleteCacheSigs();
        })
        .catch((err) => {
            res.redirect('userprofile');
        })
})

router.get('/updated', dtb.requireLogin, (req, res) => {
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

router.get("/manage", dtb.requireLogin, (req, res) => {
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

router.post("/manage", dtb.requireLogin, dtb.allRegisterFieldsManage, (req, res) => {
    Promise.all([
        dtb.updateUserProfile(req.body, req.session.user.userId),
        dtb.updateUser(req.body, req.session.user.userId)
    ])
    .then(() => {
        return dtb.getUserProfile(req.session.user.userId)
    })
    .then((results) => {
        return dtb.attachUpdatedInfo(results, req, res)
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

router.get("/password", dtb.requireLogin, (req, res) => {
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

router.post("/password", dtb.requireLogin, (req, res) => {
    dtb.checkAndUpdatePassword(req, res)
    .catch((err) => {
        console.log(err);
    })
})
