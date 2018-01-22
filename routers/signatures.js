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


router.get('/sign', user.requireLogin, (req, res) => {
    if (!req.session.hasSigned) {
        res.render('petition', {
            firstName: req.session.user.firstName,
            lastName: req.session.user.lastName,
            csrfToken: req.csrfToken(),
            manageLink: true
        });
    } else if (req.session.user.loggedIn) {
        res.redirect('/signatures/thanks');
    } else {
        res.redirect('/register');
    }
});

router.post('/sign', (req, res) => {
    if (!req.body.sig) {
        res.render('petition', {
            errorMessage: `Please enter your signature if you would like to sign the petition.`,
            csrfToken: req.csrfToken(),
            manageLink: true
        })
    } else if (req.body.sig) {
        dtb.signPetition(req.session.user, req.body.sig)
        .then((sigId) => {
            myRedis.deleteCacheSigs();
            req.session.signatureId = sigId;
            req.session.hasSigned = true
            res.redirect('/signatures/thanks');
        })
        .catch((err) => {
            res.render('petition', {
                errorMessage: "Petition non funciona!",
                csrfToken: req.csrfToken(),
                manageLink: true
            })
        })
    } else {
        res.render('petition', {
            errorMessage: "Petition non funciona!",
            csrfToken: req.csrfToken(),
            manageLink: true
        })
    }
})

router.get('/thanks', user.requireLogin, dtb.requireSignature, (req, res) => {
    Promise.all([
        dtb.getSignatures(),
        dtb.joinSigsUsers(req.session.user.userId)
    ]).then((results) => {
        res.render('thanks', {
            numberOfSigs: results[0].rows.length,
            actualSignature: results[1].rows[0].signature,
            manageLink: true
        })
    })
    .catch((err) => {
        console.log(err);
        res.redirect("/")
    })
})

router.get('/list', user.requireLogin, dtb.requireSignature, (req, res) => {
    myRedis.checkCacheSigs()
    .then((result) => {
        if (result !== null) {
            res.render('signatures', {
                signatures: JSON.parse(result),
                manageLink: true
            })
        } else {
            dtb.getSignatures()
            .then((results) => {
                myRedis.setCacheSigs("signatures", JSON.stringify(results.rows));
                console.log(results.rows);
                if (results.rows.url==="") {
                    results.rows.url = null;
                }
                res.render('signatures', {
                    signatures: results.rows,
                    manageLink: true
                })
            })
            .catch((err) => {
                res.render('signatures', {
                    error: "OH NO THERE WAS A PROBLEM ACCESSING THE DIRECTORY",
                    signatures: results.rows,
                    manageLink: true
                })
                console.log(err);
            })
        }
    })
    .catch((err) => {
        res.render('signatures', {
            error: "OH NO THERE WAS A PROBLEM ACCESSING THE DIRECTORY",
            signatures: results.rows,
            manageLink: true
        })
        console.log(err);
    })
})

router.get('/list/:city', user.requireLogin, dtb.requireSignature, (req, res) => {
    dtb.getSignatures(req.params.city)
    .then((results) => {

        res.render('signatures', {
            city: req.params.city,
            signatures: results.rows,
            manageLink: true
        })
    })
    .catch((err) => {
        res.render('signatures', {
            error: "OH NO THERE WAS A PROBLEM ACCESSING THE DIRECTORY",
            signatures: results.rows,
            manageLink: true
        })
        console.log(err);
    })
})

router.get('/delete', user.requireLogin, dtb.requireSignature, (req, res) => {
    req.session.hasSigned = false;
    dtb.deleteSig(req.session.user.userId)
    .then(() => {
        res.render('delete', {
            manageLink: true
        })
    })
})
