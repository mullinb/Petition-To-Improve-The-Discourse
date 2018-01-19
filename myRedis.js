let redis = require('redis');
let client = redis.createClient(process.env.REDIS_URL || {
    host: 'localhost',
    port: 6379
});
let spicedPg = require('spiced-pg');

let dbUrl = process.env.DATABASE_URL || `postgres:${require('./secrets').dbUser}@localhost:5432/petitionITD`;

let db = spicedPg(dbUrl);

const {promisify} = require('util');

const setex = promisify(client.setex.bind(client));
const set = promisify(client.set.bind(client));
const get = promisify(client.get.bind(client));
const del = promisify(client.del.bind(client));
const incr = promisify(client.incr.bind(client));
const expire = promisify(client.expire.bind(client));


setex('funky', 10, 'chicken')
    .then(data => {
        console.log(data);
        get('funky')
            .then(data => console.log(data))
            .catch(err => console.log(err));
    })
    .catch(err => console.log(err));

exports.setCacheSigs = (row, rowObj) => {
    console.log(row);
    return set(row, rowObj)
}

exports.checkCacheSigs = () => {
    return get('signatures')
}

exports.deleteCacheSigs = () => {
    return del('signatures');
}

exports.deleteHackRecords = (req) => {
    del(req.body.EmailAddress);
    del(req.body.EmailAddress+ "blocks");
}

exports.antiHack = (req, res) => {
    console.log(req.body.EmailAddress)
    Promise.all([
        get(req.body.EmailAddress),
        get(req.body.EmailAddress + "blocks")
    ])
    .then((result) => {
        console.log(result[0] + " THIS IS THE RESULT")
        if (result[0] < 0) {
            console.log("blocked")
            setex(req.body.EmailAddress, 180 * result[1], -2);
            incr(req.body.EmailAddress + "blocks");
            expire(req.body.EmailAddress + "blocks", 180 * result[1])
            res.render('login', {
                csrfToken: req.csrfToken(),
                errorMessage: `Too many failed login attempts. Please wait ${3 * result[1]} minutes before trying again.`
            })
        } else if (result[0] >= 3) {
            console.log("excess")
            setex(req.body.EmailAddress, 180, -2);
            setex(req.body.EmailAddress + "blocks", 180, 1);
            res.render('login', {
                csrfToken: req.csrfToken(),
                errorMessage: "Too many failed login attempts. Please wait 3 minutes before trying again."
            });
        } else if (3 > result[0] && result[0] > 0) {
            console.log("range")
            incr(req.body.EmailAddress);
            res.render('login', {
                csrfToken: req.csrfToken(),
                errorMessage: "That password is invalid."
            });
        } else if (result[0] === null) {
            console.log("null")
            setex(req.body.EmailAddress, 90, 1);
            res.render('login', {
                csrfToken: req.csrfToken(),
                errorMessage: "That password is invalid."
            });
        } else {
            console.log("else")
            res.render('login', {
                csrfToken: req.csrfToken(),
                errorMessage: "Invalid email or password."
            });
        }
    })
}
