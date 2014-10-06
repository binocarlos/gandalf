var url = require('url')
var EventEmitter = require('events').EventEmitter
var util = require('util')
var asarray = require('as-array')
var Router = require('routes-router')
var concat = require('concat-stream')
var LevelSession = require('level-session')
var Database = require('./database')

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
	var ret = {}
	ret[method.toUpperCase()] = fn
	return ret
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
Gandalf.prototype._claimHandler = require('./handlers/claim')

Gandalf.prototype._checkHandler = require('./handlers/check')

Gandalf.prototype._connectHandler = require('./handlers/connect')

Gandalf.prototype._registerHandler = require('./handlers/register')

Gandalf.prototype._loginHandler = require('./handlers/login')

Gandalf.prototype._logoutHandler = require('./handlers/logout')

Gandalf.prototype._providerHandler = require('./handlers/provider')

Gandalf.prototype.session = function(fn){
	var self = this;
	if(fn){
		return function(req, res){
			self._session(req, res, function(){
				fn(req, res)
			})
		}
	}
	else{
		return this._session	
	}
}

Gandalf.prototype.protect = function(fn){
	var self = this;
	return function(req, res){
		self._session(req, res, function(){
			req.session.get('userid', function(err, id){
				if(err || !id){
					res.statusCode = 403
					res.end('not allowed')
					self.emit('protect', req)
					return
				}
				fn(req, res)
			})
		})
	}
}

Gandalf.prototype.close = function(){
	this._session.close()
}

Gandalf.prototype.handler = function(){
	var self = this;

	return function(req, res){
		self._session(req, res, function(){
			self._httprouter(req, res)
		})
	}
}

module.exports = function(db, opts){
	return new Gandalf(db, opts)
}