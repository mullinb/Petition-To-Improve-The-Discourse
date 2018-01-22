
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

exports.requireEmail = (req, res, next) => {
    try {
        if (req.body.EmailAddress) {
            next();
        }
    } catch (e) {
        res.render("noEmail", {
            errorMessage: "You did not enter an email address. Please enter one below.",
            csrfToken: req.csrfToken(),
            firstName: req.session.user.firstName,
            lastName: req.session.user.lastName
        });
    }
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
    try {
        req.session.signatureId = results[1].rows[0].id;
        req.session.hasSigned = true;
    } catch(err) {
        console.log(err);
        req.session.hasSigned = false;
    }
    try {
        req.session.user.facebook_id = results[1].rows[0].facebook_id;
    } catch(err) {
        console.log(err);
    }
}

exports.attachUpdatedInfo = (results, req, res) => {
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
