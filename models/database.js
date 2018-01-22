let spicedPg = require('spiced-pg');

let dbUrl = process.env.DATABASE_URL || `postgres:${require('../secrets').dbUser}@localhost:5432/petitionITD`;

let bcrypt = require('bcryptjs');

let db = spicedPg(dbUrl);

let myRedis = require("../myRedis");

exports.requireSignature = (req, res, next) => {
    db.query(
        `SELECT * FROM signatures WHERE user_id = $1`, [req.session.user.userId])
    .then((results) => {
        if (results.rows[0]) {
            next();
        } else {
            res.render('/unauthorized', {
                errorMessage: `You may not view this page without first signing the <a href="/signatures/sign">petition</a>. Please sign.`
            })
        }
    })
    .catch((err) => {
        console.log(err);
    })
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
            myRedis.deleteCacheSigs();
            return results.rows[0].id;
        })
        .catch((err) => {
            console.log(err);
            return(err);
        })
}

exports.existsSingleSig = (userId, req, res) => {
    return db.query(
            `SELECT EXISTS (SELECT 1 FROM signatures WHERE signatures.user_id = $1)`, [userId])
        .then((results) => {
            req.session.hasSigned = result.rows[0].exists;
            return;
        })
}

exports.deleteSig = (userId) => {
    return db.query(
        `DELETE FROM signatures where user_id = $1;`, [userId])
        .then((results) => {
            myRedis.deleteCacheSigs();
            return results.rows[0].id;
        })
        .catch((err) => {
            console.log(err);
            return(err);
        })
}

exports.registerUser = ({FirstName, LastName, EmailAddress, Password}) => {
    console.log('hello')
    return exports.hashPassword(Password)
        .then((hash) => {
            return db.query(
            `INSERT INTO users (FirstName, LastName, Email, HashPass, datecreated) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [FirstName, LastName, EmailAddress, hash, new Date()])

    })
    .then((results) => {
        return db.query(
            `INSERT INTO user_profiles (user_id) VALUES ($1) RETURNING user_id`, [results.rows[0].id]
        )
    })
}

exports.loginUser = ({EmailAddress, Password}) => {
        let userId;
        return db.query(
            `SELECT * FROM users WHERE Email = $1`, [EmailAddress]
        ).then((results) => {
            if(results.rows.length > 0) {
                userId = results.rows[0].id;
                return exports.checkPassword(Password, results.rows[0].hashpass);
            } else {
                throw new Error("bad email")
            }
        })
        .then((results) => {
            if (results) {
                return Promise.all([
                    db.query(
                        `SELECT * FROM users WHERE Email = $1`, [EmailAddress]),
                    db.query(
                        `SELECT * FROM signatures WHERE user_id = $1`, [userId])
                ])
            } else {
                throw new Error("bad pass");
            }
        })
}

exports.getSignatures = (city) => {
    if (city) {
        return db.query(
            `SELECT users.id AS user_id, user_profiles.city, user_profiles.age, user_profiles.url, users.FirstName, users.LastName, users.Email, users.link, users.pic_url FROM user_profiles, signatures, users WHERE user_profiles.user_id = users.id and users.id = signatures.user_id and city = $1`, [city]
        )
    } else {
        return db.query(
            `SELECT users.id, user_profiles.city, user_profiles.age, user_profiles.url, users.FirstName, users.LastName, users.Email, users.link, users.pic_url FROM user_profiles, signatures, users WHERE user_profiles.user_id = users.id and users.id = signatures.user_id;`
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

exports.updateUserProfile = ({age, city, homepage}, userid) => {
    if (age==="") {
        age = null;
    }
    return db.query(
        `INSERT INTO user_profiles (user_id, age, city, url) VALUES ($1, $2, $3, $4) ON CONFLICT ON CONSTRAINT user_id_unique DO UPDATE SET user_id = $1, age = $2, city = $3, url = $4;`, [userid, age, city, homepage]
    )
}

exports.updateUser = ({FirstName, LastName, EmailAddress}, userid) => {
    return db.query(
        `UPDATE users SET firstname = $1, lastname = $2, email = $3 WHERE id = $4;`, [FirstName, LastName, EmailAddress, userid]
    )
    .then(myRedis.deleteCacheSigs);
}

exports.getUserProfile = (userId) => {
     if (userId){
        return db.query(
            `SELECT * FROM users LEFT JOIN user_profiles ON users.id = user_profiles.user_id WHERE users.id = $1`, [userId]
        )
        .then((results) => {
            myRedis.deleteCacheSigs();
            return results.rows[0]
        })
    } else {
        return db.query(
            `SELECT * FROM user_profiles`
        )
    }
}

exports.checkAndUpdatePassword = (req, res) => {
    return db.query(
        `SELECT * FROM users WHERE Email = $1`, [req.session.user.emailAddress]
    ).then((results) => {
        return exports.checkPassword(req.body.oldpassword, results.rows[0].hashpass);
    })
    .then((results) => {
        if(results) {
            if (req.body.newpasswordone === req.body.newpasswordtwo) {
                return exports.hashPassword(req.body.newpasswordone)
                .then((hash) => {
                    return db.query(
                        `UPDATE users SET hashpass = $1 WHERE Email = $2`, [hash, req.session.user.emailAddress]
                    )
                }).then(() => {
                    return exports.getUserProfile(req.session.user.userId)
                }).then((results) => {
                    res.render('userprofile', {
                        updated: true,
                        message: "Thanks for updating your profile",
                        profile: results,
                        hasSigned: req.session.hasSigned,
                        csrfToken: req.csrfToken(),
                        manageLink: true
                    })
                })
            } else {
                return exports.getUserProfile(req.session.user.userId)
                .then((results) => {
                    res.render('password', {
                        errorMessage: "New password fields do not match. Please re-enter.",
                        profile: results,
                        hasSigned: req.session.hasSigned,
                        csrfToken: req.csrfToken()
                    });
                })
            }
        } else {
            return exports.getUserProfile(req.session.user.userId)
            .then((results) => {
                res.render('password', {
                    errorMessage: "Your old password was not correct. Please re-enter.",
                    profile: results,
                    hasSigned: req.session.hasSigned,
                    csrfToken: req.csrfToken()
                });
            })
        }
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
