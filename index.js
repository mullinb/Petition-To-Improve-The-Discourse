//==========SET UP==========//

const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
// const basicAuth = require('basic-auth');
const hb = require('express-handlebars');
let spicedPg = require('spiced-pg');
const secrets = require('./secrets')
var cookieSession = require('cookie-session');

app.use(cookieSession({
    secret: 'anyColourYouLike12345',
    maxAge: 1000 * 60 * 60 * 24 * 28
}));

let db = spicedPg(`postgres:${secrets.dbUser}@localhost:5432/petitionITD`);

app.engine('handlebars', hb());
app.set('view engine', 'handlebars');

app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(cookieParser());

const pages = ['register', 'login', 'sign', 'thanks', 'signatures'];

//===============SERVER==========//

app.use(express.static('clientside'));

app.get('/',(req, res) => {
    if (!req.cookies.hasSigned && !req.session.user) {
        redirectToPage('register', req, res);
    } else if (!req.cookies.hasSigned && req.session.user && !req.session.user.loggedIn) {
        redirectToPage('login', req, res);
    } else if (req.cookies.hasSigned && req.session.user.loggedIn) {
        redirectToPage('thanks', req, res);
    } else if (req.session.user.loggedIn) {
        redirectToPage('sign', req, res);
    }
})

// app.get('/:page', (req, res) {
//     if req.params.page
// }

app.get('/register', (req, res) => {
    try {
        if (!req.cookies.hasSigned & !req.session.user.loggedIn) {
            res.render('register');
        } else if (req.cookies.hasSigned && req.session.user.loggedIn) {
            redirectToPage('thanks', req, res);
        } else if (!req.cookies.hasSigned && req.session.user.loggedIn) {
            redirectToPage('sign', req, res);
        }
    } catch (e) {
        res.render('register');
    }
})

app.get('/login', (req, res) => {

    if (!req.session.user.loggedIn) {
        res.render('login');
    } else if (!req.cookies.hasSigned) {
        redirectToPage('sign', req, res);
    } else {
        redirectToPage('thanks', req, res);
    }
})

app.get('/thanks', (req, res) => {
    if (req.cookies.hasSigned && req.session.user.loggedIn) {
        getSignatures()
        .then((results) => {
            res.render('thanks', {
                numberOfSigs: results.rows.length,
                actualSignature: results.rows[req.session.signatureId-1].signature
            })
        })
    } else if (req.session.user.loggedIn) {
        redirectToPage('sign', req, res);
    } else {
        redirectToPage('register', req, res);
    }
})

app.get('/sign'), (req, res) => {
    if (req.session.user.loggedIn && !req.cookies.hasSigned) {
        res.render('petition');
    } else if (req.session.user.loggedIn && req.cookies.hasSigned) {
        redirectToPage('thanks', req, res);
    } else {
        redirectToPage('register', req, res);
    }
}

app.get('/signatures',(req, res) => {
    if (req.session.user.loggedIn) {
        getSignatures()
        .then((results) => {
            res.render('signatures', {
                signatures: results.rows
            })
        })
        .catch((err) => {
            console.log(err);
        })
    } else {
        redirectToPage('register', req, res);
    }
})

app.post('/register', (req, res) => {
    try {
        let firstName = req.body.FirstName;
        let lastName = req.body.LastName;
        let emailAddress = req.body.EmailAddress;
        let password = req.body.Password;
        let entries = [firstName, lastName, emailAddress, password];
        let missing = [];
    } catch (e) {
        for (let i=0; i<entries.length; i++) {
            if (entries[i]==='') {
                missing.push(entries[i]);
            }
        }
        res.render('register', {
            errorMessage: `The following fields were missing: ${missing} \n please re-enter your data`,
            firstName: firstName,
            lastName: lastName,
            emailAddress: emailAddress
        })
    }
    if (firstName && lastName && emailAddress && password) {
        registerUser(firstName, lastName, emailAddress, password)
        .then(() => {
            req.session.user = {
                loggedIn: 'yes',
                firstName: firstName,
                lastName: lastName,
                emailAddress: emailAddress,
                password: password
            };
            res.cookie("hasSigned", "Signed", {
                httpOnly: true
            });
            redirectToPage('sign', req, res);
        })
        .catch((err) => {
            res.render('register', {
                errorMessage: "That was an invalid entry, please try again!"
            })
        })
    }
})

app.post('/login', (req, res) => {
    if(req.body.FirstName && req.body.LastName && req.body.sig) {
        signPetition(req.body.FirstName, req.body.LastName, req.body.sig)
        .then(getSignatures)
        .then((results) => {
            req.session.signatureId = results.rows[results.rows.length-1].id;
            res.cookie("hasSigned", "Signed", {
                httpOnly: true
            });
            redirectToPage('thanks', req, res);
        })
        .catch((err) => {
            res.render('petition', {
                errorMessage: "That was an invalid entry, please try again!"
            })
        })
    } else {
        res.render('petition', {
            errorMessage: "That was an invalid entry, please try again!"
        })
    }
})

app.post('/sign', (req, res) => {
    if(req.body.FirstName && req.body.LastName && req.body.sig) {
        signPetition(req.body.FirstName, req.body.LastName, req.body.sig)
        .then(getSignatures)
        .then((results) => {
            req.session.signatureId = results.rows[results.rows.length-1].id;
            res.cookie("hasSigned", "Signed", {
                httpOnly: true
            });
            redirectToPage('thanks', req, res);
        })
        .catch((err) => {
            res.render('petition', {
                errorMessage: "That was an invalid entry, please try again!"
            })
        })
    } else {
        res.render('petition', {
            errorMessage: "That was an invalid entry, please try again!"
        })
    }
})

function signPetition (firstName, lastName, sig) {
    return db.query(
        `INSERT INTO signatures (first, last, signature) VALUES ($1, $2, $3);`, [firstName, lastName, sig])
}

function registerUser (firstName, lastName, Email, HashPass) {
    return db.query(
        `INSERT INTO users (FirstName, LastName, Email, HashPass) VALUES ($1, $2, $3, $4);`, [firstName, lastName, Email, HashPass])
}

function getSignatures () {
    return db.query(
        `SELECT id, first, last, signature FROM signatures;`
    )
}

function redirectToPage(page, req, res, obj) {
    res.statusCode = 302;
    res.setHeader('Location', `/${page}`);
    res.end();
}

app.listen(8080, console.log("server is listening"));
