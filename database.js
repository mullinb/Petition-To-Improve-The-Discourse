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
        `SELECT * FROM signatures WHERE user_id = $1`, [req.session.user.userId])
    .then((results) => {
        if (results.rows[0]) {
            next();
        }
    })
    .catch((err) => {
        console.log(err);
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
                csrfToken: req.csrfToken(),
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
            csrfToken: req.csrfToken(),
            errorMessage: `There was an unknown error`,
            firstName: req.body.FirstName,
            lastName: req.body.LastName,
            emailAddress: req.body.EmailAddress
        })
    }
}

exports.allRegisterFieldsManage = (req, res, next) => {
    try {
        let entries = {
            "First Name": req.body.FirstName,
            "Last Name": req.body.LastName,
            "Email": req.body.EmailAddress,
        }
        let missing = [];
        for (var p in entries) {
            if (entries[p]==='') {
                missing.push("" + p);
            }
        }
        if (missing.length > 0) {
            exports.getUserProfile(req.session.user.userId)
            .then((results) => {
                console.log(results);
                res.render('manageprofile', {
                    csrfToken: req.csrfToken(),
                    message: `You did not enter any data for ${missing}. This data is required. All fields have been reset to their previous values.`,
                    profile: results,
                    hasSigned: req.session.hasSigned
                })
            })
        } else {
            next();
        }
    } catch (e) {
        res.render('manageprofile', {
            csrfToken: req.csrfToken(),
            errorMessage: `There was an unknown error`,
            firstName: req.body.FirstName,
            lastName: req.body.LastName,
            emailAddress: req.body.EmailAddress
        })
    }
}

exports.signPetition = ({userId}, sig) => {
    return db.query(
        `INSERT INTO signatures (signature, user_id) VALUES ($1, $2) RETURNING id;`, [sig, userId])
        .then((results) => {
            return results.rows[0].id;
        })
        .catch((err) => {
            console.log(err);
            return(err);
        })
}

exports.deleteSig = (userId) => {
    return db.query(
        `DELETE FROM signatures where user_id = $1;`, [userId])
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

    })
    .then((results) => {
        return results.rows[0].id;
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
                    `SELECT * FROM signatures WHERE user_id = $1`, [userId])
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
    console.log(results);
    req.session.user = {
        loggedIn: true,
        firstName: results[0].rows[0].firstname,
        lastName: results[0].rows[0].lastname,
        emailAddress: results[0].rows[0].email,
        password: true,
        userId: results[0].rows[0].id
    };
    try {
        req.session.signatureId = results[1].rows[0].id;
        req.session.hasSigned = true;
    } catch(e) {
        console.log(e);
        req.session.hasSigned = false;
    }
}

exports.attachUpdatedInfo = (results, req, res) => {
    console.log(results);
    req.session.user = {
        loggedIn: true,
        firstName: results.firstname,
        lastName: results.lastname,
        emailAddress: results.email,
        password: true,
        userId: results.user_id
    };
    return results;
}

exports.getSignatures = (city) => {
    if (city) {
        return db.query(
            `SELECT users.id, user_profiles.city, user_profiles.age, user_profiles.url, users.FirstName, users.LastName, users.Email FROM user_profiles, signatures, users WHERE user_profiles.user_id = users.id and users.id = signatures.user_id and city = $1`, [city]
        )
    } else {
    return db.query(
        `SELECT users.id, user_profiles.city, user_profiles.age, user_profiles.url, users.FirstName, users.LastName, users.Email FROM user_profiles, signatures, users WHERE user_profiles.user_id = users.id and users.id = signatures.user_id;`
        )
    }
}
exports.getUsers = () => {
    return db.query(
        `SELECT id, FirstName, LastName, Email FROM users;`
    )
}

exports.joinSigsUsers = (id) => {
    return db.query (
        `SELECT signature FROM signatures
        JOIN users
        ON signatures.user_id = $1`, [id]
    )
}

exports.joinSigsProfiles = (sigs) => {

}

exports.updateUserProfile = ({age, city, homepage}, userid) => {
    if (age==="") {
        age = null;
    }
    return db.query(
        `INSERT INTO user_profiles (user_id, age, city, url) VALUES ($1, $2, $3, $4) ON CONFLICT ON CONSTRAINT user_id_unique DO UPDATE SET user_id = $1, age = $2, city = $3, url = $4;`, [userid, age, city, homepage]
    )
}

exports.updateUser = ({FirstName, LastName, EmailAddress, Password}, userid) => {
    if (Password.length > 0) {
        return exports.hashPassword(Password)
        .then((hash) => {
            return db.query(
                `UPDATE users SET firstname = $1, lastname = $2, email = $3, hashpass = $4 WHERE id = $5;`, [FirstName, LastName, EmailAddress, hash, userid]
            )
        })
    } else {
        return db.query(
            `UPDATE users SET firstname = $1, lastname = $2, email = $3 WHERE id = $4;`, [FirstName, LastName, EmailAddress, userid]
        )
    }
}

exports.getUserProfile = (userId) => {
     if (userId){
        return db.query(
            `SELECT * FROM users LEFT JOIN user_profiles ON users.id = user_profiles.user_id WHERE users.id = $1`, [userId]
        )
        .then((results) => {
            return results.rows[0]
        })
    } else {
        return db.query(
            `SELECT * FROM user_profiles`
        )
    }
}

exports.updatePassword = (EmailAddress, Password) => {
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
                    `SELECT * FROM signatures WHERE user_id = $1`, [userId])
                ])
        } else {
            throw new Error;
        }
    })
    .catch((err) => {
        console.log(err);
    })
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
