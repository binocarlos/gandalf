var url = require('url')
var EventEmitter = require('events').EventEmitter
var util = require('util')
var asarray = require('as-array')
var Router = require('routes')
var concat = require('concat-stream')
var LevelSession = require('level-session')
var Database = require('./database')
var Extractors = require('./extractors')

// keep a log of the Provider classes
var Providers = {}
function ProviderFactory(name){
	var Provider = null
	if(Providers[name]){
		return Providers[name]
	}
	Provider = require('./providers/' + name)
	Providers[name] = Provider
	return Provider
}

function methodFilter(method, fn){
	return function(req, res, match){
		if(req.method.toLowerCase()!=method){
			res.statusCode = 404
			res.end('route not found')
			return
		}
		fn(req, res, match)
	}
}

function Gandalf(db, opts){
	var self = this;
	opts = opts || {}
	EventEmitter.call(this)
	this._db = new Database(db, opts)
	this._db.on('storage:put', function(key, value){
		self.emit('storage:put', key, value)
	})
	this._db.on('storage:batch', function(batch){
		self.emit('storage:batch', batch)
	})

	
	this.opts = opts || {
		providers:{}
	}

	this._providers = {}

	Object.keys(this.opts.providers || {}).forEach(function(key){
	  self._providers[name] = ProviderFactory(name)
	})
	
	this._session = opts.session ? opts.session : LevelSession({
		db:opts.sessiondb ? opts.sessiondb : db
	})

	this._httprouter = new Router()

	this._addRoutes()
}

util.inherits(Gandalf, EventEmitter)

// get a provider all hooked up with the keys
Gandalf.prototype._makeProvider = function(name, done){
	var self = this;
	
	var Provider = self._providers[name]

	if(!Provider){
		return done('no provider for: ' + name + ' found')
	}
	var config = self.opts.providers[name]

	if(!config){
		return done('no config for ' + name + ' found')
	}

	if(Provider && config){
		var provider = new Provider(config)

		provider.once('auth', function(req, res, packet){
			self._connectHandler(req, res, provider, packet)
		})

		provider.once('error', function(err){
			console.error(err)
		})

		done(null, provider)
	}
	else{
		done('no provider or config found')
	}
}

Gandalf.prototype._addRoutes = function(name){
	var self = this
	
	this._httprouter.addRoute('/register', methodFilter('post', function(req, res, match){
		self._registerHandler(req, res)
	}))
	this._httprouter.addRoute('/login', methodFilter('post', function(req, res, match){
		self._loginHandler(req, res)
	}))
	this._httprouter.addRoute('/logout', methodFilter('get', function(req, res, match){
		self._logoutHandler(req, res)
	}))
	this._httprouter.addRoute('/check', methodFilter('get', function(req, res, match){
		self._checkHandler(req, res)
	}))
	this._httprouter.addRoute('/claim', methodFilter('post', function(req, res, match){
		self._claimHandler(req, res)
	}))
	this._httprouter.addRoute('/status', methodFilter('get', function(req, res, match){
		self._statusHandler(req, res)
	}))
	this._httprouter.addRoute('/:provider', function(req, res, match){
		self._providerHandler(req, res, match)
	})
}


Gandalf.prototype._statusHandler = function(req, res){
	var self = this;
	req.session.get('userid', function(err, id){
    var user = users[id] || {}
    user.id = id;
    res.end(JSON.stringify(user))
  })
}

// set the username for connected users
Gandalf.prototype._claimHandler = function(req, res){
	var self = this;
	
	req.pipe(concat(function(body){

		body = JSON.parse(body.toString())
		
		var username = body.username

		req.session.get('userid', function(err, loggedInId){

			if(err || !loggedInId){
				res.statusCode = 403
				res.end('must be logged in')
				self.emit('log:error', 'claim', 'user not logged in')
				return
			}

			self._db.checkUsername('local', username, function(err, ok){
				if(!ok){
					res.statusCode = 500
					res.end('name already taken')
					self.emit('log:error', 'claim', username + ' already taken')
				}
				else{
					self._db.registerUser('local', loggedInId, username, null, function(err){
						self.emit('log', 'claim', username + ' claimed')
						self.emit('claim', username)
						res.end('ok')
					})
				}
			})
		})
	}))
}

Gandalf.prototype._checkHandler = function(req, res){
	var self = this;
	var query = url.parse(req.url).query
	self._db.checkUsername('local', query.username, function(err, ok){
		var val = ok ? 'ok' : 'notok'
		self.emit('log', 'check', query, val)
		res.end(val)
	})
}

Gandalf.prototype._connectHandler = function(req, res, provider, data){
	var self = this;
	
	req.session.get('userid', function(err, loggedInId){

		if(!loggedInId){
			res.statusCode = 500
			res.end('not logged in')
			self.emit('log:error', 'connect', 'not logged in')
			return
		}

		self.emit('log', 'connect', loggedInId)

		self._db.connect(loggedInId, req.provider, data, function(err, userid, data){
			if(err){
				res.statusCode = 500
				res.end(err)
				self.emit('log:error', 'connect', err)
				return
			}
			req.session.set('userid', userid, function(){
				if(err){
					res.statusCode = 500
					res.end(err)
					self.emit('log:error', 'session', err)
					return
				}
				Extractors[req.provider](provider, data, function(err, profile){
					if(err){
						res.statusCode = 500
						res.end(err)
						self.emit('log:error', 'extractor', err)
						return
					}

					profile.id = userid
					self._db.saveProfile(userid, req.provider, profile, function(err){
						if(err){
							res.statusCode = 500
							res.end(err)
							self.emit('log:error', 'saveprofile', err)
							return
						}
						self.emit('connect', req.provider, profile)
						self.emit('log', 'connect:profile', profile)
						res.redirect('/')
					})
				})
			})
		})
	})
}

Gandalf.prototype._registerHandler = function(req, res){
	var self = this;

	req.pipe(concat(function(body){
		body = JSON.parse(body.toString())
		var username = body.username
		var password = body.password
		self._db.checkUsername('local', username, function(err, ok){
			if(!ok){
				err = 'username already exists'
			}
			if(err){
				res.statusCode = 500
				res.end(ok ? 'ok' : 'notok')
				self.emit('log:error', 'register', err)
				return
			}

			delete(body.password)

			self._db.registerUser('local', null, username, password, function(err, userid){
				req.session.set('userid', userid, function(){
					body.id = userid
					self._db.saveProfile(userid, 'local', body, function(err){
						self.emit('log', 'register:user', body)
						self.emit('register', username, body)
						res.statusCode = 200;
						res.end('ok')
					})
				})
				
			})
		})
	}))
}

Gandalf.prototype._loginHandler = function(req, res){
	var self = this;

	function returnError(e){
		res.statusCode = 500
		res.end(e.toString())
		return
	}

	req.pipe(concat(function(body){

		body = JSON.parse(body.toString())

		var username = body.username
		var password = body.password

		req.session.get('userid', function(err, id){
			if(id){
				res.statusCode = 500
				self.emit('log:error', 'login', 'already logged in')
				res.end('notok')
			}
			else{
				self._db.checkPassword(username, password, function(err, userid){
					if(!userid){
						err = 'incorrect details'
						self.emit('log:error', 'login', 'incorrect details')
					}
					if(err) return returnError(err)
					req.session.set('userid', userid, function(err){
						if(err) return returnError(err)
						res.statusCode = 200
						self.emit('log', 'login:ok', username)
						self.emit('login', username)
						res.end('ok')
					})
				})
			}
		})

	}))
}

Gandalf.prototype._logoutHandler = function(req, res){
	var self = this;
	req.session.destroy(function(){
		self.emit('log', 'logout:ok')
		self.emit('logout', req)
		res.redirect('/')
	})
}

Gandalf.prototype._providerHandler = function(req, res, match){
	req.provider = match.params.provider
	
	this._makeProvider(match.params.provider, function(err, provider){
		if(provider){
			self.emit('log', 'provider:request', req.url)
			self.emit('provider', req.provider, req)
			provider.emit('request', req, res)	
		}
		else{
			res.statusCode = 404
			var err = 'provider: ' + match.params.provider + ' not found'
			self.emit('log', 'provider:error', err)
			res.end(err)
		}
		
	})
}

Gandalf.prototype.session = function(){
	return this._session
}

Gandalf.prototype.protect = function(){
	return function(req, res, next){
		self._session(req, res, function(){
			req.session.get('userid', function(err, id){
				if(err || !id){
					res.statusCode = 403
					res.end('not allowed')
					self.emit('protect', req)
					return
				}
				next()
			})
		})
	}
}

Gandalf.prototype.close = function(){
	this._session.close()
}

Gandalf.prototype.handler = function(){
	var self = this;

	function route(req, res){
		var path = url.parse(req.url).pathname
	  var match = self._httprouter.match(path)
	  if(match){
	  	self.emit('request', req)
	  	match.fn(req, res, match)
	  }
	  else{
	  	res.statusCode = 404
	  	res.end(req.url + ' not found')
	  }
	}

	return function(req, res, next){
		self._session(req, res, route)
	}
}

module.exports = function(db, opts){
	return new Gandalf(db, opts)
}