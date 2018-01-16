//==========SET UP==========//

const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const csurf = require('csurf');
const bodyParser = require('body-parser');
const hb = require('express-handlebars');
let spicedPg = require('spiced-pg');
const secrets = require('./secrets')
var cookieSession = require('cookie-session');
const dtb = require('./database.js');

app.use(cookieSession({
    secret: 'anyColourYouLike12345',
    maxAge: 1000 * 60 * 60 * 24 * 28
}));

let db = spicedPg(`postgres:${secrets.dbUser}@localhost:5432/petitionITD`);

app.engine('handlebars', hb({
    defaultLayout: "layout"
    })
);

app.set('view engine', 'handlebars');


app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(csurf());

app.use(cookieParser());


const pages = ['register', 'login', 'sign', 'thanks', 'signatures'];

//===============SERVER==========//

app.use(express.static('clientside'));

app.get('/', (req, res) => {
    console.log(req.session)
    if (!req.session.hasSigned && !req.session.user) {
        res.redirect('/register');
    } else if (req.session.hasSigned && req.session.user.loggedIn) {
        res.redirect('/thanks');
    } else if (req.session.user.loggedIn) {
        res.redirect('/sign');
    }
})

app.get('/logout', (req, res) => {
    req.session = null;
    res.redirect('/register');
})

app.get('/register', (req, res) => {
    try {
        if (!req.session.hasSigned & !req.session.user.loggedIn) {
            res.render('register', {
                csrfToken: req.csrfToken()
            });
        } else if (req.session.hasSigned && req.session.user.loggedIn) {
            res.redirect('/thanks');
        } else if (!req.session.hasSigned && req.session.user.loggedIn) {
            res.redirect('/sign');
        }
    } catch (e) {
        res.render('register', {
            csrfToken: req.csrfToken()
        });
    }
})


app.post('/register', dtb.allRegisterFields, (req, res) => {
    dtb.registerUser(req.body)
        .then((userId) => {
            dtb.attachRegistrationInfo(userId, req, res);
            res.redirect('/userprofile');
        })
        .catch((err) => {
            res.render('register', {
                errorMessage: "That was an invalid entry, please try again!",
                csrfToken: req.csrfToken()
            })
        })
})

app.get('/login', dtb.requireLogout, (req, res) => {
    res.render('login', {
        csrfToken: req.csrfToken()
    });
})


app.post('/login', (req, res) => {
    dtb.loginUser(req.body)
    .then((results) => {
        dtb.attachLoginInfo(results, req, res);
        res.redirect('/');
    })
    .catch((err) => {
        console.log(err);
        res.render('login', {
            csrfToken: req.csrfToken(),
            errorMessage: "Invalid username or password."
        });
    })
})

app.get('/userprofile', dtb.requireLogin, (req, res) => {
    dtb.getUserProfile(req.session.user.userId)
    .then((results) => {
        res.render('userprofile', {
            profile: results,
            hasSigned: req.session.hasSigned,
            csrfToken: req.csrfToken()
        });
    })
})

app.post('/userprofile', dtb.requireLogin, (req, res) => {
    dtb.updateUserProfile(req.body, req.session.user.userId)
        .then((results) => {
            res.redirect('/userupdated');
        })
        .catch((err) => {
            res.redirect('userprofile');
        })
})


app.get('/userupdated', dtb.requireLogin, (req, res) => {
    dtb.getUserProfile(req.session.user.userId)
    .then((results) => {
        res.render('userprofile', {
            message: "Thanks for updating your profile",
            profile: results,
            hasSigned: req.session.hasSigned,
            csrfToken: req.csrfToken()
        });
    })
});

app.get("/userprofile/manage", dtb.requireLogin, (req, res) => {
    console.log(req.session.user.userId);
    dtb.getUserProfile(req.session.user.userId)
    .then((results) => {
        console.log(results);
        res.render('manageprofile', {
            message: "You may update your profile information here.",
            profile: results,
            hasSigned: req.session.hasSigned,
            csrfToken: req.csrfToken()
        });
    })
});

app.post("/userprofile/manage", dtb.requireLogin, dtb.allRegisterFieldsManage, (req, res) => {
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
        console.log(results);
        res.render('manageprofile', {
            message: "Thanks for updating your profile!",
            profile: results,
            hasSigned: req.session.hasSigned,
            csrfToken: req.csrfToken()
        });
    })
    .catch(err => console.log(err))
});

app.get('/sign', dtb.requireLogin, (req, res) => {
    if (!req.session.hasSigned) {
        res.render('petition', {
            firstName: req.session.user.firstName,
            lastName: req.session.user.lastName,
            csrfToken: req.csrfToken()
        });
    } else if (req.session.user.loggedIn) {
        res.redirect('/thanks');
    } else {
        res.redirect('/register');
    }
});

app.post('/sign', (req, res) => {
    if (!req.body.sig) {
        res.render('petition', {
            errorMessage: `Please enter your signature if you would like to sign the petition.`,
            csrfToken: req.csrfToken()
        })
    } else if (req.body.sig) {
        dtb.signPetition(req.session.user, req.body.sig)
        .then((sigId) => {
            req.session.signatureId = sigId;
            req.session.hasSigned = true;
            res.redirect('/thanks');
        })
        .catch((err) => {
            res.render('petition', {
                errorMessage: "Petition non funciona!",
                csrfToken: req.csrfToken()
            })
        })
    } else {
        res.render('petition', {
            errorMessage: "Petition non funciona!",
            csrfToken: req.csrfToken()
        })
    }
})

app.get('/thanks', dtb.requireLogin, dtb.requireSignature, (req, res) => {
    Promise.all([
        dtb.getSignatures(),
        dtb.joinSigsUsers(req.session.user.userId)
    ]).then((results) => {
        res.render('thanks', {
            numberOfSigs: results[0].rows.length,
            actualSignature: results[1].rows[req.session.user.userId-1].signature
        })
    })
    .catch((err) => {
        console.log(err);
        res.redirect("/")
    })
})

app.get('/signatures', dtb.requireLogin, dtb.requireSignature, (req, res) => {
    dtb.getSignatures()
    .then((results) => {
        res.render('signatures', {
            signatures: results.rows
        })
    })
    .catch((err) => {
        res.render('signatures', {
            error: "OH NO THERE WAS A PROBLEM ACCESSING THE DIRECTORY",
            signatures: results.rows
        })
        console.log(err);
    })
})

app.get('/signatures/:city', dtb.requireLogin, dtb.requireSignature, (req, res) => {
    dtb.getSignatures(req.params.city)
    .then((results) => {
        res.render('signatures', {
            city: req.params.city,
            signatures: results.rows
        })
    })
    .catch((err) => {
        res.render('signatures', {
            error: "OH NO THERE WAS A PROBLEM ACCESSING THE DIRECTORY",
            signatures: results.rows
        })
        console.log(err);
    })
})

app.get('/thanks/delete', dtb.requireLogin, dtb.requireSignature, (req, res) => {
    req.session.hasSigned = false;
    dtb.deleteSig(req.session.user.userId)
    .then(() => {
        res.render('delete')
    })

})

app.get("*", (req, res) => {
        res.render("invalid", {

        })
})

app.listen(8080, console.log("server is listening"));
