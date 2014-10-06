gandalf
=======

node.js oauth login wizard with leveldb session storage

[![Travis](http://img.shields.io/travis/binocarlos/gandalf.svg?style=flat)](https://travis-ci.org/binocarlos/gandalf)

![gandalf gif](http://media.giphy.com/media/njYrp176NQsHS/giphy.gif "gandalf gif")

## install

```
$ npm install gandalf
```

## usage

You mount a gandalf onto an express/HTTP server and it will deal with OAuth and password based logins.

It uses leveldb to save sessions and user ids - other data (like profiles) is emitted for you to save how you want.

```js
var http = require('http')
var Router = require('routes-router')
var ware = require('ware')
var level    = require('level-test')()
var sublevel = require('level-sublevel')
var Gandalf = require('../../')
var ecstatic = require('ecstatic')
var db = sublevel(level('gandalf-examples--simple', {encoding: 'json'}))

var gandalf = Gandalf(db, {
  providers:{
    facebook:{
      id:process.env.FACEBOOK_ID,
      secret:process.env.FACEBOOK_SECRET
    },
    twitter:{
      id:process.env.TWITTER_ID,
      secret:process.env.TWITTER_SECRET
    }
  }
})


// in memory database for user profile data
// you can handle this how you want (e.g. other leveldb / Redis etc)
var users = {}

gandalf.on('save', function(provider, data){
  var user = users[data.id] || {}
  user[provider] = data
  users[data.id] = user
})

var router = Router()
var middleware = ware()

var app = function(req, res){
	middleware.run(req, res, router)	
}

// enable sessions for all routes
middleware.use(gandalf.session())

// mount the OAuth login handlers
router.addRoute('/auth/*', gandalf.handler())

// get the current session data
router.addRoute('/status', {
	'GET':function(req, res){
	  req.session.get('userid', function(err, id){
	    var user = users[id] || {}
	    user.id = id;
	    res.end(JSON.stringify(user))
	  })
	 }
})

router.addRoute('/private', gandalf.protect())
router.addRoute('/*', ecstatic(__dirname + '/www'))

var server = http.createServer(app)

server.listen(80, function(){
  console.log('server listening');
})
```

## api

### var gandalf = Gandalf(db, options)

create a new authentication handler by passing in an existing [leveldb](https://github.com/rvagg/node-levelup) - this can also be a [sub-level](https://github.com/dominictarr/level-sublevel)

The options are:

 * providers - an array of provider names that will be enabled

### gandalf.enable(providername)

Enable a login provider - the supported types are:

 * password
 * google
 * facebook
 * github
 * dropbox
 * twitter

### gandalf.virthost(function(hostname, done){})

This enables virtual hosting (i.e. multiple sets of OAuth keys being used by one gandalf)

You are provided with the hostname - you should load the oauth details for that hostname and pass them to the callback

```js
gandalf.virthost(function(hostname, done){
	myDatabase.loadOauthTokens(hostname, function(err, data){
		if(err) return done(err)
		done(null, {
			providers:{
				facebook:{
					id:data.facebook.id,
					secret:data.facebook.secret
				}
			}
		})
	})
})
```

### gandalf.session()

Return express middleware that will inject a session object unto req and res

### gandalf.handler()

Return express handler that enables logins for users.

This handle can be mounted onto the host express application where you want.

 * GET /<providername> - e.g. /auth/google - this triggers the OAuth login loop for a provider
 * POST /register - post username and password and other fields to register a new user
 * POST /login - post username and password fields to login using the password method
 * POST /claim - post a username to use for a connected user
 * GET /logout - clear the session and redirect to '/'
 * GET /check?username=<username> - check if the given username exists
 * GET /status - return a JSON representation of the current session - this includes OAuth tokens

### gandalf.protect(function(req, appid, userid, done){})

Return express middleware that will protect resources further down the chain.

If you pass a function it is used to decide on access for the request - the request itself plus the `appid` and `userid` are passed.

Run the callback with either true or false to indicate access:

```js
app.use('/private2', gandalf.protect(function(method, appid, userid, done){

	// method is GET, POST (i.e. HTTP method)

	// run the callback with true or false to indicate access
	done(null, true)

}), function(req, res, next){

	// all logged in users populate userid inside of the session
	req.session.get('userid', function(err, userid){
		res.end(req.session.userid + ' is logged in')
	})
	
	
})
```

If you do not pass a function then there just needs to be a user for access to be granted.

### gandalf.delete(id, function(){})

Delete a user and all their details

### gandalf.disconnect(id, provider, function(){})

Remove the connection details for 'provider' in the given user

## events

### gandalf.on('save', function(appid, provider, userid){})

Called when a user logs in with the password provider

### gandalf.on('login', function(appid, provider, userid){})

Called when a user logs in with the password provider


### gandalf.on('login', function(appid, provider, userid){})

Called when a user logs in with the password provider

### gandalf.on('register', function(appid, provider, userid){})

Called when a user registers with the password provider

### gandalf.on('connect', function(appid, provider, userid){})

Called when a user connects with an OAuth provider


### gandalf.on('delete', function(userid){})

Called when a user has been deleted

### gandalf.on('user', function(appid, provider, userid, data){})

Called when there is profile data to save for a user - this is returned from the OAuth providers and from extra fields in the register form.

Save the data however you want - the name of the provider that generated the data is passed along with the primary key (userid) and the data object itself.

## license

MIT