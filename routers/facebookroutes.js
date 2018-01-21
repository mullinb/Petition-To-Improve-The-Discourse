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

router.get("/arrive", (req, res) => {
    let fbUser;
    console.log('working');
    console.log(req.body.fbAccessToken);
    if (req.body.fbAccessToken) {
        fb.API(req.body.fbAccessToken)
        .then((results) => {
            fbUser = results;
            return fb.registerOrLogin(results);
        })
        .then((result) => {
            if (result) {
                fb.loginFacebookUser(result);
            } else {
                fb.registerFacebookUser(fbUser);
            }
        })
        .then(() => {
        })
    }
})
