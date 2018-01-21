let FB = require('fb');
let promisify = require("util").promisify;
let fbAPI = promisify(FB.api);
FB.options({
    appId: 388841504898975
});

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
        console.log(err);
    })
}

exports.registerFacebookUser = ({first_name, last_name, email, id}) => {
    console.log("attempting register");
    return db.query(
        `INSERT INTO users (firstname, lastname, email, facebook_id, datecreated) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [first_name, last_name, email, id, new Date()]
    ).then((results) => {
        console.log(results)
        return results.rows[0].id;
    })
}

exports.loginFacebookUser = ({first_name, last_name, email, id}) => {
    console.log("attempting login");
    return db.query(
        `INSERT INTO users (firstname, lastname, email, facebook_id, datecreated) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [first_name, last_name, email, id, new Date()]
    ).then((results) => {
        console.log(results)
        return results.rows[0].id;
    })
}


exports.registerOrLogin = ({id}) => {
    return db.query(
        `SELECT * FROM users WHERE users.facebook_id = $2`, [id]
    )
    .then((result) => {
        // console.log(result);
        return results;
    })
}
