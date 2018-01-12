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

let cookies = false;
let sessionUser = false;

try {
    if (req.cookies.hasSigned) {
        cookies = true;
    }
} catch (e) {console.log('not signed')}

try {
    if (req.session.user) {
        sessionUser = req.session.user;
    }
} catch (e) (console.log('either logged out or unregistered'))

app.use(express.static('clientside'));

app.get('/',(req, res) => {
    if (!cookies && !sessionUser) {
        redirectToPage('register', req, res);
    } else if (!cookies && sessionUser && !sessionUser.loggedIn) {
        redirectToPage('login', req, res);
    } else if (cookies && sessionUser.loggedIn) {
        redirectToPage('thanks', req, res);
    } else if (sessionUser.loggedIn) {
        redirectToPage('sign', req, res);
    }
})

app.get('/register', (req, res) => {
    try {
        if (!cookies & !sessionUser.loggedIn) {
            res.render('register');
        } else if (cookies && sessionUser.loggedIn) {
            redirectToPage('thanks', req, res);
        } else if (!cookies && sessionUser.loggedIn) {
            redirectToPage('sign', req, res);
        }
    } catch (e) {
        res.render('register');
    }
})

app.get('/login', (req, res) => {
    if (!sessionUser.loggedIn) {
        res.render('login');
    } else if (!cookies) {
        redirectToPage('sign', req, res);
    } else {
        redirectToPage('thanks', req, res);
    }
})

app.get('/thanks', (req, res) => {
    if (cookies && sessionUser.loggedIn) {
        getSignatures()
        .then((results) => {
            res.render('thanks', {
                numberOfSigs: results.rows.length,
                actualSignature: results.rows[req.session.signatureId-1].signature
            })
        })
    } else if (sessionUser.loggedIn) {
        redirectToPage('sign', req, res);
    } else {
        redirectToPage('register', req, res);
    }
})

app.get('/sign'), (req, res) => {
    if (!cookies && sessionUser.loggedIn) {
        res.render('petition');
    } else if (cookies && sessionUser.loggedIn) {
        redirectToPage('thanks', req, res);
    } else {
        redirectToPage('register', req, res);
    }
}

app.get('/signatures',(req, res) => {
    if (sessionUser.loggedIn) {
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
            errorMessage: `The following fields were missing: ${missing} \n Please complete these fields.`,
            firstName: firstName,
            lastName: lastName,
            emailAddress: emailAddress
        })
    }
    if (firstName && lastName && emailAddress && password) {
        registerUser(firstName, lastName, emailAddress, password)
        .then((userId) => {
            req.session.user = {
                loggedIn: 'yes',
                firstName: firstName,
                lastName: lastName,
                emailAddress: emailAddress,
                password: true
                userId: userId;
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


app.post('/sign', (req, res) => {
    if (!req.body.sig) {
        res.render('petition', {
            errorMessage: `Please enter your signature if you would like to sign the petition.`
        })
    } else if(req.body.sig) {
        signPetition(sessionUser.FirstName, sessionUser.LastName, req.body.sig, sessionUser.userId)
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


app.post('/login', (req, res) => {
    try {
        let emailAddress = req.body.EmailAddress;
        let password = req.body.Password;
    } catch (e) {
        res.render('login', {
            errorMessage: "Invalid username or password."
        });
    }
    if(req.body.EmailAddress && req.body.Password) {
        signPetition(req.body.FirstName, req.body.LastName, req.body.sig, req.session.userId)
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


function signPetition (firstName, lastName, sig, userId) {
    return db.query(
        `INSERT INTO signatures (first, last, signature, userId) VALUES ($1, $2, $3, $4);`, [firstName, lastName, sig, userId])
        .then((results) => {
            return results.rows[results.rows.length-1].id;
        })
        .catch((err) => {
            return(err);
        })
}

function registerUser (firstName, lastName, Email, HashPass) {
    return db.query(
        `INSERT INTO users (FirstName, LastName, Email, HashPass) VALUES ($1, $2, $3, $4);`, [firstName, lastName, Email, HashPass])
        .then((results) => {
            return results.rows[results.rows.length-1].id;
        })
        .catch((err) => {
            return(err);
        })
}

function getSignatures () {
    return db.query(
        `SELECT id, first, last, signature FROM signatures;`
    )
}
function getUsers () {
    return db.query(
        `SELECT FirstName, LastName, Email FROM users WHERE FirstName = $1 && LastName = $2 and Email =$3 and HashPass = $4;`
        , [firstName, lastName, Email, HashPass])
    )
}


function redirectToPage(page, req, res, options) {
    res.statusCode = 302;
    res.setHeader('Location', `/${page}`);
    res.end();
}

app.listen(8080, console.log("server is listening"));
