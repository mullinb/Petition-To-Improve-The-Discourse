let spicedPg = require('spiced-pg');
const secrets = require('./secrets')

let db = spicedPg(`postgres:${secrets.dbUser}@localhost:5432/actors`);

db.query('SELECT name FROM actors').then((results) => {
    console.log(results.rows);
}).catch((err) => {
    console.log(err);
})

function getActor(actor) {
    return db.query(
        `SELECT * FROM actors WHERE name = $1,` [actor])
    ).then((results) => {
        return results.rows[0];
    })
    .catch((err) => {
        console.log(err);
    })
}
