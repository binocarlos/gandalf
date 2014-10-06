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
var level    = require('level-test')()
var Gandalf = require('gandalf')
var ecstatic = require('ecstatic')
var db = level('gandalf-examples--simple', {encoding: 'json'})

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

var router = Router()

// mount the OAuth login handlers
router.addRoute('/auth/*', gandalf.handler())

// get the current session data
router.addRoute('/status', {
	// add session handler to this method
	'GET':gandalf.session(function(req, res){
		req.session.get('userid', function(err, id){

			// load the user from the userid in the session
			gandalf.loadUser(id, function(err, user){
				res.end(JSON.stringify(user))	
			})
		})
	})
})

// only logged in people can see this route
router.addRoute('/private', gandalf.protect())

// these are served without hitting the session
router.addRoute('/*', ecstatic(__dirname + '/www'))

var server = http.createServer(router)

server.listen(80, function(){
  console.log('server listening');
})
```

## api

#### var gandalf = Gandalf(db, options)

create a new authentication handler by passing in an existing [leveldb](https://github.com/rvagg/node-levelup) - this can also be a [sub-level](https://github.com/dominictarr/level-sublevel)

Pass a `providers` config to activate external OAUTH providers:

```js
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
```

The supported types are:

 * google
 * facebook
 * github
 * dropbox
 * twitter

Password mode (/register and /login) are activated automatically.

One user can `connect` multiple external providers and link them to the same user id.

#### gandalf.session()

Return a function that will create a `session` property of the request:

```js
var session = gandalf.session()

router.addRoute('/api', function(req, res){
	session(req, res, function(){

		// we now have a session for the request
		req.session.get('userid', function(err, userid){

		})
	})
})
```

You can also pass a function to gandalf.session and it will be wrapped:

```js
router.addRoute('/api', gandalf.session(function(req, res){
	//req.session is populated
}))
```

#### gandalf.handler()

Mount the authentication handler onto an endpoint of your application (for example on `/auth`).

You can then link to `/auth/github` to perform a github login or POST to `/auth/register` to register new accounts.

```js
router.addRoute('/api', gandalf.handler())
```

The following are the routes that are mounted:

##### GET /<providername>

e.g. `/auth/google` - this triggers the OAuth login loop for a provider

##### POST /register
post username and password and other fields to register a new user

```json
{
	"username":"bob",
	"password":"123",
	"email":"bob@bob.com",
	"likes":"porridge"
}
```

##### POST /login
post username and password fields to login using the password method

```json
{
	"username":"bob",
	"password":"123"
}
```

##### POST /claim
post a username to use for a connected user - use this when a user connects using an external service but you still need a `username` (as opposed to just an id)

```json
{
	"username":"bob"
}
```

##### GET /logout
clear the session and redirect to '/'

##### GET /check?username=<username>
check if the given username exists

##### GET /status
return a JSON representation of the current session - this includes OAuth tokens

#### gandalf.protect(function(req, appid, userid, done){})

Return a 403 error if the user is not logged in:

```js
router.addRoute('/private', gandalf.protect(function(req, res){
	// the user is logged in
	// we also have req.session and req.userid
}))
```

If you do not pass a function then there just needs to be a user for access to be granted.

#### gandalf.delete(id, function(){})

Delete a user and all their details

#### gandalf.disconnect(id, provider, function(){})

Remove the connection details for 'provider' in the given user

## events

#### gandalf.on('storage:put', function(key, value){})

When a value has been put to the database

#### gandalf.on('storage:batch', function(key, value){})

When a batch has been sent to the database

#### gandalf.on('request', function(req){})

A HTTP request has hit the handler

#### gandalf.on('provider', function(name, req){})

A HTTP request has hit a provider handler

#### gandalf.on('protect', function(req){})

A resource has been denied in a protect handler

#### gandalf.on('login', function(username){})

A login request

#### gandalf.on('register', function(username, body){})

A register request

#### gandalf.on('connect', function(provider, profile){})

A connect request

#### gandalf.on('save', function(id, provider, profile){})

A user profile has been created by `provider`

#### gandalf.on('claim', function(username){})

A claim request

#### gandalf.on('logout', function(req){})

A logout request

#### gandalf.on('log', function(type, message){})

#### gandalf.on('log:error', function(type, message){})

## license

MIT