let spicedPg = require('spiced-pg');
const secrets = require('./secrets')
let db = spicedPg(`postgres:${secrets.dbUser}@localhost:5432/petitionITD`);
let bcrypt = require('bcryptjs');


exports.requireLogout = (req, res, next) => {
    try {
        if (req.session.user.loggedIn) {
            res.redirect('/sign');}
    } catch (e) {
        next();
    }
}

exports.requireLogin = (req, res, next) => {
    try {
        if (req.session.user.loggedIn) {
            next();
        }
    } catch (e) {
        res.redirect('/register');
    }
}
exports.requireSignature = (req, res, next) => {
    db.query(
        `SELECT * FROM signatures WHERE userid = $1`, [req.session.user.userId])
    .then((results) => {
        if (results) {
            next();
        }
    })
    .catch((err) => {
        res.redirect('/');
    })
}


exports.allRegisterFields = (req, res, next) => {
    try {
        let entries = {
            "First Name": req.body.FirstName,
            "Last Name": req.body.LastName,
            "Email": req.body.EmailAddress,
            "Password": req.body.Password
        }
        let missing = [];
        for (var p in entries) {
            if (entries[p]==='') {
                missing.push("" + p);
            }
        }
        if (missing.length > 0) {
            res.render('register', {
                errorMessage: `Please complete the following fields: ${missing}.`,
                firstName: req.body.FirstName,
                lastName: req.body.LastName,
                emailAddress: req.body.EmailAddress
            })
        } else {
            next();
        }
    } catch (e) {
        res.render('register', {
            errorMessage: `There was an unknown error`,
            firstName: req.body.FirstName,
            lastName: req.body.LastName,
            emailAddress: req.body.EmailAddress
        })
    }
}

exports.signPetition = ({firstName, lastName, userId}, sig) => {
    return db.query(
        `INSERT INTO signatures (first, last, signature, userId) VALUES ($1, $2, $3, $4) RETURNING id;`, [firstName, lastName, sig, userId])
        .then((results) => {
            return results.rows[0].id;
        })
        .catch((err) => {
            console.log(err);
            return(err);
        })
}

exports.registerUser = ({FirstName, LastName, EmailAddress, Password}) => {
    return exports.hashPassword(Password)
        .then((hash) => {
            return db.query(
            `INSERT INTO users (FirstName, LastName, Email, HashPass, datecreated) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [FirstName, LastName, EmailAddress, hash, new Date()])
                .then((results) => {
                    return results.rows[0].id;
                })
    })
    .catch((err) => {
        return(err);
    })
}

// SELECT * FROM users WHERE Email = 'jess@gmail.com'

exports.loginUser = ({EmailAddress, Password}) => {
    let userId;
    return db.query(
        `SELECT * FROM users WHERE Email = $1`, [EmailAddress]
    ).then((results) => {
        userId = results.rows[0].id;
        return exports.checkPassword(Password, results.rows[0].hashpass);
    })
    .then((results) => {
        if(results) {
            return Promise.all([
                db.query(
                    `SELECT * FROM users WHERE Email = $1`, [EmailAddress]),
                db.query(
                    `SELECT * FROM signatures WHERE userid = $1`, [userId])
                ])
        } else {
            throw new Error;
        }
    })
    .catch((err) => {
        console.log(err);
    })
}

exports.attachRegistrationInfo = (userId, req, res) => {
    req.session.user = {
        loggedIn: true,
        firstName: req.body.FirstName,
        lastName: req.body.LastName,
        emailAddress: req.body.EmailAddress,
        password: true,
        userId: userId
    };
    req.session.hasSigned = false;
}

exports.attachLoginInfo = (results, req, res) => {
    req.session.user = {
        loggedIn: true,
        firstName: results[0].rows[0].firstname,
        lastName: results[0].rows[0].lastname,
        emailAddress: results[0].rows[0].email,
        password: true,
        userId: results[0].rows[0].id
    };
    if (results[1].rows[0]) {
        req.session.signatureId = results[1].rows[0].id;
        req.session.hasSigned = true;
    } else {
        req.session.hasSigned = false;
    }
}

exports.getSignatures = () => {
    return db.query(
        `SELECT id, first, last, signature, userid FROM signatures`
    )
}
exports.getUsers = () => {
    return db.query(
        `SELECT id, FirstName, LastName, Email FROM users;`
    )
}

exports.joinSigsUsers = (id) => {
    return db.query (
        `SELECT signature FROM signatures
        LEFT OUTER JOIN users
        ON signatures.userid = $1`, [id]
    )
}

exports.hashPassword = (plainTextPassword) => {
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(function(err, salt) {
            if (err) {
                return reject(err);
            }
            bcrypt.hash(plainTextPassword, salt, function(err, hash) {
                if (err) {
                    return reject(err);
                }
                resolve(hash);
            });
        });
    });
}

exports.checkPassword = (textEnteredInLoginForm, hashedPasswordFromDatabase) => {
    return new Promise(function(resolve, reject) {
        bcrypt.compare(textEnteredInLoginForm, hashedPasswordFromDatabase, function(err, doesMatch) {
            if (err) {
                reject(err);
            } else {
                resolve(doesMatch);
            }
        });
    });
}
