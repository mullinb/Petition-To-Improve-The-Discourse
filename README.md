# <a href="https://petition-i-t-d.herokuapp.com/">Petition To Improve The Discourse</a>

<h3>SPICED Academy Project: Static web portal served by Node.js server with dual database integration and Facebook Login</h3>

<img src="https://s3.amazonaws.com/fluxlymoppings/pics/q7xBpTW0ogjQ0vEHGVosesA5yFARMrtF.png" width=600>

This project introduced our class to PostGreSQL and relational databases in general. A series of static webpages collect personal information from the user and then request them to sign a (fictional) petition using a canvas HTML element. Once a user has signed the petition, a list of other signers is available, and can additionally sorted by location. 

<img src="https://s3.amazonaws.com/fluxlymoppings/pics/-PszUK9mHPfvpwJ0bnr2XRYGEmWe4b8y.jpg" width=600>

PostGreSQL is used to handle the storage of user information and signatures. RedisSession is used to manage user login state, including for users who utilize Facebook Login. The Google Maps API was included to encourage uniformity in location names and for ease of use. It's also pretty neat to have Google's logo somewhere on your first real web project. Finally, Handlebars templates were used to generate the pages, which dynamically populate user-specific information at runtime. 

<img src="https://s3.amazonaws.com/fluxlymoppings/pics/o5zM1e3ozYTBHARQvz6rje_zMerPqSIJ.png" width=600>

The Facebook Login functionality was an additional feature I implemented in order to learn how to use a very important API. As desired, users who select to login with Facebook will see their personal details automatically associated with their new account on my page. This greatly improves usability of the site for many users, if adding some complexity to the backend. Note that if you would like to test this functionality, I will need to invite your Facebook account as a tester on my Facebook Developer account. I am happy to do this at any time!

Check it out live on Heroku <a href="https://petition-i-t-d.herokuapp.com/">here</a>.

<img src="https://s3.amazonaws.com/fluxlymoppings/pics/6dr8-Y9esaLlIqp2769qdzwBwtEcptuZ.png" width=600>

Note: this is not the best example of my abilities with CSS or styling in general; Please have a look at my Connect Four project if you would like a better idea of my skills in that area.
