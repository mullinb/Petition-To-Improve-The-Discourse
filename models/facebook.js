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
        return(err);
    })
}

exports.registerOrLogin = ({id}) => {
    return db.query(
        `SELECT EXISTS (SELECT 1 FROM users WHERE users.facebook_id = $1)`, [JSON.parse(id)]
    )
    .then((result) => {
        console.log(result.rows[0].exists);
        return result.rows[0].exists;
    })
}

exports.getFBUserProfile = (fbId) => {
    return db.query(
        `SELECT * FROM users LEFT JOIN user_profiles ON users.id = user_profiles.user_id WHERE users.facebook_id = $1`, [fbId]
    )
    .then((results) => {
        return results.rows[0];
    })
}

exports.registerFacebookUser = ({first_name, last_name, link, email, id}, picUrl) => {
    let password = generator.generate({
        length: 10,
        numbers: true
    });
    return dtb.hashPassword(password)
    .then((hash) => {
        return db.query(
            `INSERT INTO users (firstname, lastname, email, pic_url, link, HashPass, facebook_id, datecreated) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING firstname, lastname, email, facebook_id, id`, [first_name, last_name, email, picUrl, link, hash, id, new Date()]
        )
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

exports.registerNoEmailUser = ({firstName, lastName, fbId, picUrl, link}, email) => {
    console.log("attempting registerNoEmail");
    let password = generator.generate({
        length: 10,
        numbers: true
    });
    return dtb.hashPassword(password)
    .then((hash) => {
        return db.query(
            `INSERT INTO users (firstname, lastname, email, HashPass, pic_url, link, facebook_id, datecreated) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [first_name, last_name, email, hash, picUrl, link, fbId, new Date()]
        )
    })
    .then((results) => {
        console.log(results)
        return results.rows[0].id;
    })
}

exports.generateUserProfile = (results) => {
    return db.query(
        `INSERT INTO user_profiles (user_id) VALUES ($1)`, [results.rows[0].id])
}
