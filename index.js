var url = require('url')
var EventEmitter = require('events').EventEmitter
var util = require('util')
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
	EventEmitter.call(this)

	this._db = new Database(db, opts)
	this.opts = opts || {
		providers:{}
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
Gandalf.prototype._makeProvider = function(installation, name, done){
	var self = this;
	
	var Provider = Providers[name]

	if(!Provider){
		return done('no provider for: ' + name + ' found')
	}
	var config = installation.providers[name]

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
	var installationid = req.installation ? req.installation.id : 'default'

	req.pipe(concat(function(body){

		body = JSON.parse(body.toString())
		
		var username = body.username

		req.session.get('userid', function(err, loggedInId){

			if(err || !loggedInId){
				res.statusCode = 403
				res.end('must be logged in')
				return
			}

			self._db.checkUsername(installationid, 'local', username, function(err, ok){
				if(!ok){
					res.statusCode = 500
					res.end('name already taken')
				}
				else{
					self._db.registerUser(installationid, 'local', loggedInId, username, null, function(err){
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
	var installationid = req.installation ? req.installation.id : 'default'
	self._db.checkUsername(installationid, 'local', query.username, function(err, ok){
		res.end(ok ? 'ok' : 'notok')
	})
}

Gandalf.prototype._connectHandler = function(req, res, provider, data){
	var self = this;
	var installationid = req.installation ? req.installation.id : 'default'
	req.session.get('userid', function(err, loggedInId){

		self._db.connect(installationid, loggedInId, req.provider, data, function(err, userid, data){
			if(err){
				res.statusCode = 500
				res.end(err)
				return
			}
			req.session.set('userid', userid, function(){

				Extractors[req.provider](provider, data, function(err, profile){

					profile.installationid = installationid
					profile.id = userid
					self.emit('save', req.provider, profile)
					res.redirect('/')

				})
			})
		})
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

			self._db.registerUser(installationid, 'local', null, username, password, function(err, userid){
				req.session.set('userid', userid, function(){
					body.installationid = installationid
					body.id = userid
					self.emit('save', 'local', body)
					res.statusCode = 200;
					res.end('ok')
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

	var installationid = req.installation ? req.installation.id : 'default'

	req.pipe(concat(function(body){

		body = JSON.parse(body.toString())

		var username = body.username
		var password = body.password

		req.session.get('userid', function(err, id){
			if(id){
				console.error('already logged in')
				res.statusCode = 500
				res.end('notok')
			}
			else{
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
			}
		})

	}))
}

Gandalf.prototype._logoutHandler = function(req, res){
	req.session.destroy(function(){
		res.redirect('/')
	})
}

Gandalf.prototype._providerHandler = function(req, res, match){
	req.provider = match.params.provider
	
	this._makeProvider(req.installation, match.params.provider, function(err, provider){
		if(provider){
			provider.emit('request', req, res)	
		}
		else{
			res.statusCode = 404
			res.end('provider: ' + match.params.provider + ' not found')
		}
		
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