var EventEmitter = require('events').EventEmitter
var util = require('util')
var Router = require('routes')
var concat = require('concat-stream')
var LevelSession = require('level-session')
var Database = require('./database')

// keep a log of the Provider classes
var Providers = {}
function ProviderFactory(name){
	var Provder = null
	if(Providers[name]){
		return Providers[name]
	}
	try{
		Provder = require('./providers/' + name)
		Provders[name] = Provder
	} catch(e){
		console.error('no provider: ' + name)
	}
	return Provder
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
	EventEmitter.call(this)

	this._db = Database(db, opts)
	this.opts = opts || {}

	(opts.providers).forEach(function(name){
		self.enable(name)
	})

	this._addRoutes()
}

util.inherits(Gandalf, EventEmitter)

module.exports = Gandalf

// get a provider all hooked up with the keys
Gandalf.prototype._makeProvider = function(req, done){
	var self = this;
	var Provider = ProviderFactory(req.params.provider)
	this._router(req.headers.host, function(err, appid){
		// first get the keys
		self._apikeys(appid, name, function(err, keys){
			if(err || !keys){
				return done(err)
			}

			if(!keys.id || !keys.secret){
				return done('id and secret properties required in keys')
			}

			var provider = Provider(keys)

			provider.once('auth', function(req, res, data){
				self.connect(req, res, data)
			})

			done(null, provider)
		})
	})
}

Gandalf.prototype._addRoutes = function(name){
	var self = this
	this._httprouter = new Router()
	this._httprouter.addRoute('/register', methodFilter('post', function(req, res, match){
		self._register(req, res)
	}))
	this._httprouter.addRoute('/login', methodFilter('post', function(req, res, match){
		self._login(req, res)
	}))
	this._httprouter.addRoute('/logout', methodFilter('get', function(req, res, match){
		self._logout(req, res)
	}))
	this._httprouter.addRoute('/status', methodFilter('get', function(req, res, match){
		self._status(req, res)
	}))
	this._httprouter.addRoute('/:provider', function(req, res, match){
		self._provider(req, res)
	})
}

Gandalf.prototype.check_fns = function(name){
	if(!this._router){
		throw new Error('_router needed')
	}
	if(!this._apikeys){
		throw new Error('_apikeys needed')
	}
}

Gandalf.prototype._register = function(req, res){
	var self = this;
	req.pipe(concat(function(body){
		body = JSON.parse(body)

		var username = body.username
		var password = body.password

		self._db.usernameExists(username, function(err, exists){
			if(exists){
				err = 'username already exists'
			}
			if(err){
				res.statusCode = 500
				res.end(err.toString())
				return
			}

			delete(body.username)
			delete(body.password)

			self._db.registerUser(username, password, function(err, done){
				self.emit('register', body)
				res.statusCode = 200;
				res.end('ok')
			})
		})
	}))
}

Gandalf.prototype._login = function(req, res){
	var self = this;

	function returnError(e){
		res.statusCode = 500
		res.end(e.toString())
		return
	}
	req.pipe(concat(function(body){
		body = JSON.parse(body)

		var username = body.username
		var password = body.password

		self._db.checkPassword(username, password, function(err, ok){
			if(!ok){
				err = 'incorrect details'
			}
			if(err) return returnError(err)
			req.session.set('user', username, function(err){
				if(err) return returnError(err)
				res.statusCode = 200
				res.end('ok')
			})
		})
	}))
}

Gandalf.prototype._logout = function(req, res){
	req.session.destroy(function(){
		res.redirect('/')
	})
}

Gandalf.prototype._status = function(req, res){
	req.session.getAll(function(err, status){
		res.end(JSON.stringify(status))
	})
}

Gandalf.prototype._provider = function(req, res){
	this.makeProvider(req, function(err, provider){
		provider.emit('request', req, res)
	})
}

/*

	PUBLIC API
	
*/
Gandalf.prototype.enable = function(name){
	if(name){
		this._providers[name] = Provider(name)
	}
	return this
}

Gandalf.prototype.router = function(fn){
	this._router = fn
	return this
}

Gandalf.prototype.apikeys = function(fn){
	this._apikeys = fn
	return this
}


Gandalf.prototype.session = function(){
	this.check_fns()
	return function(req, res, next){

	}
}

Gandalf.prototype.protect = function(){
	this.check_fns()
	return function(req, res, next){

	}
}

Gandalf.prototype.handler = function(){
	this.check_fns()
	return function(req, res, next){

	}
}

module.exports = function(opts){
	opts = opts || {}
	return new Gandalf(opts)
}