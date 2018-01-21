let https = require("https");
var FB = require('fb');


// const options = {
//   hostname: 'graph.facebook.com',
//   port: 443,
//   path: '/v2.11/me?fields=id,name,picture,email,location,address,gender,birthday,age_range',
//   method: 'GET',
//   Authorization: "OAuth EAAFhpjfFZC58BAIA0pWfbBQ6cEZB3sJvHtrKE8dNUFcF1ZBiGFhkWBMNnjkRj3Qp5QwGszeZBv0ZB8KZCGojchJSN7ClSpVeyMf53SyzDYgcXOLib1WyZAXrKmjtbuZAKXVfz3qPYpVUUNX9rhG6zMyI3cWu3l9IFVtIc95qXBNi6DqPUNvWpTVzX43hZABL1C2QZD"
// };
//
// AppID: 388841504898975,
// AppSecret: "316a6ac71284b28593cdcccd075840ab"



FB.options({
    appId: 388841504898975
});


FB.setAccessToken('EAACEdEose0cBABg0ZBsgi3hbqmcM006JIRgjqLT3oFm2zkGptjaw2ZBcjAC0jbmIZAoveluiZBAGdqS3Icq3f5mBHfGBgkSGP0QhF3bbNVweIwEzMU0XzZC4hL3d64yp9J67U6bZCF0WgWFRSZCV9xnbftq0avWw9NqoM41akVZAexDC4EZCAvZCmZBCRwR47ZCJoQkZD');

console.log(FB.options());

FB.api('/me',
    'GET',
    {
        "fields": "id,name,about,education,birthday,email,first_name,last_name,relationship_status,gender,locale,location,link,website,friends,cover,picture"
    },
    function (res) {
        if(!res || res.error) {
            console.log(!res ? 'error occurred' : res.error);
            return;
        }
        console.log(res);
        console.log(res.id);
        console.log(res.first_name);
        console.log(res.last_name);
        console.log(res.location);
        console.log(res.birthday);
        console.log(res.picture.data.url);
        console.log(res.email);
        console.log(res.email);
        console.log(res.website);
        console.log(res.link);
    }
);
