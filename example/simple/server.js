var http = require('http')
var express = require('express')
var level    = require('level-test')()
var sublevel = require('level-sublevel')
var Gandalf = require('../../')
var ecstatic = require('ecstatic')
var fs = require('fs')

var db = sublevel(level('gandalf-examples--simple', {encoding: 'json'}))

var gandalf = Gandalf(db, {
	providers:['facebook']
})

// return an appid from a domain name - this enables virtual hosting
gandalf.router(function(domain, done){
	done(null, domain)
})

// return the api keys for a provider in one app (the string return by 'route')
gandalf.apikeys(function(appid, provider, done){
	done(null, {
		id:process.env[provider.toUpperCase() + '_ID'],
		secret:process.env[provider.toUpperCase() + '_SECRET']
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

// the logged in or not branch
app.get('/', function(req, res){
	res.setHeader('Content-Type', 'text/html')
	req.session.get('userid', function(err, id){
		if(!err && id){
			fs.createReadStream(__dirname + '/www/admin.html').pipe(res)
		}
		else{
			fs.createReadStream(__dirname + '/www/index.html').pipe(res)
		}
	})
})

app.use(ecstatic(__dirname + '/www'))

server.listen(80, function(){
	console.log('server listening');
})