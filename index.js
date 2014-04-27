var url = require('url')
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

	this._db = new Database(db, opts)
	this.opts = opts || {
		providers:{}
	}

	if(!this.opts.path){
		throw new Error('path option required for Gandalf to start')
	}

	this._providers = {}

	Object.keys(this.opts.providers || {}).forEach(function(key){
	  self.enable(key)      
	})
	
	this._db.on('batch', function(b){
		self.emit('batch', b)
	})

	this._session = LevelSession({
		db:db
	})

	this._httprouter = new Router()

	this._addRoutes()
}

util.inherits(Gandalf, EventEmitter)

module.exports = Gandalf

// get a provider all hooked up with the keys
Gandalf.prototype._makeProvider = function(req, done){
	var self = this;
	var Provider = Providers[req.params.provider]

	if(!Provider){
		done('no provider for: ' + req.params.provider + ' found')
	}
	var config = req.installation.providers[req.params.provider]

	if(Provider && config){
		var provider = Provider(keys)

		provider.once('auth', function(req, res, data){
			self.connect(req, res, data)
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
	this._httprouter.addRoute('/:provider', function(req, res, match){
		self._providerHandler(req, res)
	})
}

Gandalf.prototype._checkHandler = function(req, res){
	var self = this;
	var query = url.parse(req.url).query
	var installation = req.installation ? req.installation.id : 'default'
	self._db.checkUsername(installation, 'local', query.username, function(err, ok){
		res.end(ok ? 'ok' : 'notok')
	})
}

Gandalf.prototype._registerHandler = function(req, res){
	var self = this;
	var installationid = req.installation ? req.installation.id : 'default'

	req.pipe(concat(function(body){
		body = JSON.parse(body.toString())
		var username = body.username
		var password = body.password
		self._db.checkUsername(installationid, 'local', username, function(err, ok){
			if(!ok){
				err = 'username already exists'
			}
			if(err){
				res.statusCode = 500
				res.end(ok ? 'ok' : 'notok')
				return
			}

			delete(body.password)

			self._db.registerUser(installationid, 'local', username, password, function(err, userid){
				body.installationid = installationid
				body.id = userid
				self.emit('save', body)
				res.statusCode = 200;
				res.end('ok')
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

	var installationid = req.installation ? req.installation.id : 'default'

	req.pipe(concat(function(body){

		body = JSON.parse(body.toString())

		var username = body.username
		var password = body.password

		self._db.checkPassword(installationid, username, password, function(err, userid){
			if(!userid){
				err = 'incorrect details'
			}
			if(err) return returnError(err)
			req.session.set('userid', userid, function(err){
				if(err) return returnError(err)
				res.statusCode = 200
				res.end('ok')
			})
		})
	}))
}

Gandalf.prototype._logoutHandler = function(req, res){
	req.session.destroy(function(){
		res.redirect('/')
	})
}

Gandalf.prototype._providerHandler = function(req, res){
	this.makeProvider(req, function(err, provider){
		provider.emit('request', req, res)
	})
}

/*

	PUBLIC API
	
*/
Gandalf.prototype.enable = function(name){
	if(name){
		this._providers[name] = ProviderFactory(name)
	}
	return this
}

Gandalf.prototype.virthost = function(fn){
	this._virthost = fn
	return this
}

Gandalf.prototype.session = function(){
	return this._session
}

Gandalf.prototype.protect = function(){
	return function(req, res, next){
		req.session.get('userid', function(err, id){
			if(err || !id){
				res.statusCode = 403
				res.end('not allowed')
				return
			}
			next()
		})
	}
}

Gandalf.prototype.handler = function(){
	var self = this;

	function route(installation, req, res){
		installation.host = req.headers.host
		installation.baseurl = req.headers.host + self.opts.path
		req.installation = installation
		var path = url.parse(req.url).pathname
	  var match = self._httprouter.match(path)
	  if(match){
	  	match.fn(req, res, match)
	  }
	  else{
	  	res.statusCode = 404
	  	res.end(req.url + ' not found')
	  }
	}

	return function(req, res, next){
		if(self._virthost){
			self._virthost(req.headers.host, function(err, installation){
				route(installation, req, res)
			})
		}
		else{

			providers = self.opts.providers || {}

			route({
				id:'default',
				providers:providers
			}, req, res)
		}
	}
}

module.exports = function(db, opts){
	return new Gandalf(db, opts)
}