gandalf
=======

node.js oauth login wizard with leveldb session storage

![gandalf gif](http://media.giphy.com/media/njYrp176NQsHS/giphy.gif "gandalf gif")

## install

```
$ npm install gandalf
```

## usage

The Gandalf auth object emits events when it needs to know things like API tokens and database access.

This lets you handle storage using any Key Value store (e.g. Redis, LevelDB) and to host the authentication for many websites on a single Gandalf server

```js
var http = require('http')
var express = require('express')
var Gandalf = require('gandalf')
var db = require('level')('/tmp/gandalfdb')

var gandalf = Gandalf(db, {
	providers:['facebook']
})

gandalf.enable('google')

// return an appid from a domain name - this enables virtual hosting
gandalf.router(function(domain, done){
	done(null, domain)
})

// return the api keys for a provider in one app (the string return by 'route')
gandalf.virthost(function(domain, done){

	db.loadInstallation(domain, function(err, installation){
		done(null, {
			id:installation.id,
			providers:{
				facebook:{
					id:installation.facebook_id,
					secret:installation.facebook_secret
				}
			}		
		})
	})
	
})

// create a server and mount the handler anywhere you want
var app = express()
var server = http.createServer(app)

// enable sessions for req & res
app.use(gandalf.session())

// enables users to login using '/auth/facebook' for example
app.use('/auth', gandalf.handler())

// protect urls for only logged in users
app.use('/private', gandalf.protect(), function(req, res, next){

	// all logged in users populate userid inside of the session
	req.session.get('userid', function(err, userid){
		res.end(req.session.userid + ' is logged in')
	})
	
	
})

// protect urls with a custom method
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

server.listen(80, function(){

})
```

## api

### var gandalf = Gandalf(db, config)

create a new authentication handler by passing in an existing [leveldb](https://github.com/rvagg/node-levelup) - this can also be a [sub-level](https://github.com/dominictarr/level-sublevel)

The options are:

 * providers - an array of provider names that will be `enabled`

### gandalf.enable(providername)

Enable a login provider - the supported types are:

 * password
 * google
 * facebook
 * github
 * dropbox
 * twitter

### gandalf.router(function(domain, done){})

This enables virtual hosting (i.e. multiple sets of OAuth keys being used by one gandalf)

The domain used for the request is passed in (e.g. apples.myapp.com) - this function must run the callback with a string representing what app this domain belongs to.

The appid will be used to save user and sessions in a namespace for that app.

```js

// use whatever logic you want to resolve the domain into an app id
gandalf.router(function(domain, done){
	db.loadAppFromDomain(domain, done)
})

// you can use the domain itself as the appid
gandalf.router(function(domain, done){
	done(null, domain)
})
```

### gandalf.apikeys(function(appid, provider, done){})

This is also part of the virtual hosting and should return an object with `key` and `secret` properties.

The function will be run with the appid and the name of the provider:

```js
gandalf.apikeys(function(appid, provider, done){
	if(provider=='facebook' && domain.match(/myapp\.com$/)){
		done(null, {
			key:process.env.FACEBOOK_KEY,
			secret:process.env.FACEBOOK_SECRET
		})
	}
	else{
		// we can load the keys async from an external database
		databaseObject.getOauthKeys(appid, provider, done)
	}
})
```

### gandalf.session()

Return express middleware that will inject a session object unto req and res


### gandalf.login()

Return express handler that enables logins for users.

This handle can be mounted onto the host express application where you want.

 * GET /<providername> - e.g. /auth/google - this triggers the OAuth login loop for a provider
 * POST /register - post username and password and other fields to register a new user
 * POST /login - post username and password fields to login using the password method
 * GET /logout - clear the session and redirect to '/'
 * GET /status - return a JSON representation of the current session

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

## events

### gandalf.on('login', function(appid, provider, userid){})

Called when a user logs in with a provider

### gandalf.on('register', function(appid, provider, userid){})

Called when a user has registered - this is called even for OAuth providers when first logging in.

Subsequent connects with Oauth providers do not trigger this event.

### gandalf.on('user', function(appid, provider, userid, data){})

Called when there is profile data to save for a user - this is returned from the OAuth providers and from extra fields in the register form.

Save the data however you want - the name of the provider that generated the data is passed along with the primary key (userid) and the data object itself.

## license

MIT