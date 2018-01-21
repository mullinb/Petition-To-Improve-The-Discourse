//==========SET UP==========//

const express = require('express');
const app = express();
const csurf = require('csurf');
const bodyParser = require('body-parser');
const hb = require('express-handlebars');
let spicedPg = require('spiced-pg');
const dtb = require('./models/database.js');
let myRedis = require("./myRedis");
var session = require('express-session');
var Store = require('connect-redis')(session);
var sslRedirect = require('heroku-ssl-redirect');
var secure = require('express-force-https');

let fb = require('./models/facebook.js');

app.use(sslRedirect());

let registration = require('./routers/registration')
let signatures = require('./routers/signatures')
let userprofile = require('./routers/userprofile')

var store = {};
if(process.env.REDIS_URL){
   store = {
       url: process.env.REDIS_URL
   };
} else {
   store = {
       ttl: 3600,
       host: "localhost",
       port: 6379
   };
}

app.use(session({
    store: new Store(store),
    resave: false,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET || require('./secrets').sessionSecret
}));

console.log(process.env.NODE_ENV)

let dbUrl = process.env.DATABASE_URL || `postgres:${require('./secrets').dbUser}@localhost:5432/petitionITD`;

let db = spicedPg(dbUrl);

app.engine('handlebars', hb({
    defaultLayout: "layout"
    })
);

app.set('view engine', 'handlebars');

app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(csurf());





//==================ROUTES============//

app.use(express.static('clientside'));

app.get('/', (req, res) => {
    console.log(req.session);
    if (!req.session.hasSigned && !req.session.user) {
        res.render("landing")
    } else if (req.session.hasSigned && req.session.user.loggedIn) {
        res.redirect('/signatures/thanks');
    } else if (req.session.user.loggedIn) {
        res.redirect('/signatures/sign');
    }
})

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.render("logout");
})

app.use("/facebook", facebookroutes)
app.use("/arrival", registration);
app.use("/userprofile", userprofile);
app.use("/signatures", signatures);

app.get("*", (req, res) => {
    res.render("invalid", {
        manageLink: true
    })
})

//==========ITS ALIVE=========//

app.listen(process.env.PORT || 8080, console.log("server is listening"));
