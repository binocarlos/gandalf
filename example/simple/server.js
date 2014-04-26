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