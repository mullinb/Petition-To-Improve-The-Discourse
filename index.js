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

app.use(express.static('clientside'));


app.get('/',(req, res) => {
    if (!req.cookies.hasSigned) {
        res.render('petition')
    } else {
        getSignatures()
        .then((results) => {
            res.render('thanks', {
                numberOfSigs: results.rows.length,
                actualSignature: results.rows[req.session.signatureId-1].signature
            })
        })
        .catch((err) => {
            console.log(err);
            res.render('thanks', {
                numberOfSigs: "AN UNKNOWN NUMBER OF"
            })
        })
    }
})

app.get('/signatures',(req, res) => {
    getSignatures()
    .then((results) => {
        res.render('signatures', {
            signatures: results.rows
        })
    })
    .catch((err) => {
        console.log(err);
    })

})

app.post('/', (req, res) => {
    if(req.body.FirstName && req.body.LastName && req.body.sig) {
        signPetition(req.body.FirstName, req.body.LastName, req.body.sig)
        .then(getSignatures)
        .then((results) => {
            req.session.signatureId = results.rows[results.rows.length-1].id;
            res.cookie("hasSigned", "Signed", {
                httpOnly: true
            });
            res.render('thanks', {
                numberOfSigs: results.rows.length,
                actualSignature: results.rows[req.session.signatureId-1].signature
            })
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

function getSignatures () {
    return db.query(
        `SELECT id, first, last, signature FROM signatures;`
    )
}



app.listen(8080, console.log("server is listening"));
