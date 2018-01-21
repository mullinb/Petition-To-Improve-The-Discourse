let FB = require('fb');
let promisify = require("util").promisify;
let fbAPI = promisify(FB.api);
const dtb = require('./database.js');
FB.options({
    appId: 388841504898975
});

var generator = require('generate-password');

let spicedPg = require('spiced-pg');

let dbUrl = process.env.DATABASE_URL || `postgres:${require('../secrets').dbUser}@localhost:5432/petitionITD`;

let db = spicedPg(dbUrl);

let myRedis = require("../myRedis");


// fbAPI('/me',
//     'GET',
//     {
//         "fields": "id,name,about,education,birthday,email,first_name,last_name,relationship_status,gender,locale,location,link,website,friends,cover,picture"
//     }
// ).then((res) => {
//         if(!res || res.error) {
//             console.log(!res ? 'error occurred' : res.error);
//             return;
//         }
//         console.log(res);
//         console.log(res.id);
//         console.log(res.first_name);
//         console.log(res.last_name);
//         console.log(res.location);
//         console.log(res.birthday);
//         console.log(res.picture.data.url);
//         console.log(res.email);
//         console.log(res.email);
//         console.log(res.website);
//         console.log(res.link);
//
// }).catch((err) => {
//     console.log(err);
// })


module.exports.API = (accessToken) => {
    FB.setAccessToken(`${accessToken}`);
    return fbAPI('/me',
        'GET',
        {
            "fields": "id,name,about,education,birthday,email,first_name,last_name,relationship_status,gender,locale,location,link,website,friends,cover,picture"
        }
    ).then((res) => {
            if(!res || res.error) {
                console.log("error occurred");
                console.log(!res ? 'error occurred' : res.error);
                return;
            }
            return(res);
    }).catch((err) => {
        console.log("error2 occurred");
        console.log("how's this possible " + err);
        return(err);
    })
}

exports.registerOrLogin = ({id}) => {
    console.log(id);
    return db.query(
        `SELECT EXISTS (SELECT 1 FROM users WHERE users.facebook_id = $1)`, [JSON.parse(id)]
    )
    .then((result) => {
        console.log(result.rows[0].exists);
        return result.rows[0].exists;
    })
}

exports.loginFacebookUser = ({id}) => {
    console.log("attempting login");
    let userId;

    return Promise.all([
        db.query(
            `SELECT * FROM users WHERE facebook_id = $1`, [id]),
        db.query(`SELECT * FROM signatures WHERE user_id = $1`, [userId])
)

    ]
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

    return db.query(
        `INSERT INTO users (firstname, lastname, email, facebook_id, datecreated) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [first_name, last_name, email, id, new Date()]
    ).then((results) => {
        console.log(results)
        return results.rows[0].id;
    })
}

exports.getFBUserProfile = (fbId) => {
    return db.query(
        `SELECT * FROM users LEFT JOIN user_profiles ON users.id = user_profiles.user_id WHERE users.facebook_id = $1`, [fbId]
    )
    .then((results) => {
        return results.rows[0]
    })
}



exports.registerFacebookUser = ({first_name, last_name, email, id}) => {
    console.log("attempting register");
    let password = generator.generate({
        length: 10,
        numbers: true
    });
    return exports.hashPassword(password)
    .then((hash) => {
        return db.query(
            `INSERT INTO users (firstname, lastname, email, HashPass, facebook_id, datecreated) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [first_name, last_name, email, hash, id, new Date()]
        )
    })
    .then((results) => {
        console.log(results)
        return results.rows[0].id;
    })
}

exports.attachNoEmailInfo = ({first_name, last_name, id}, req, res) => {
    req.session.user = {
        loggedIn: true,
        firstName: first_name,
        lastName: last_name,
        password: true,
        fbId: id
        };
}

exports.registerNoEmailUser = ({firstName, lastName, fbId}, email) => {
    console.log("attempting registerNoEmail");
    let password = generator.generate({
        length: 10,
        numbers: true
    });
    return exports.hashPassword(password)
    .then((hash) => {
        return db.query(
            `INSERT INTO users (firstname, lastname, email, HashPass, facebook_id, datecreated) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [first_name, last_name, email, hash, fbId, new Date()]
        )
    })
    .then((results) => {
        console.log(results)
        return results.rows[0].id;
    })
}
