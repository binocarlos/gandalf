var EventEmitter = require('events').EventEmitter
var util = require('util')
var uuid = require('node-uuid')
var utils = require('./utils')
var concat = require('concat-stream')
function Database(db, opts){
	var self = this;
	EventEmitter.call(this)

	this._db = db
	this.opts = opts || {}
}

util.inherits(Database, EventEmitter)

module.exports = Database

// default~profile~123-123-123 = {..}
// default~user~local~binocarlos = 123-123-123
// default~password~123-123-123 = DjhkdfjKHJNdfkhDf
// default~links~123-123-123-local-binocarlos = 123-123-123
Database.prototype.registerUser = function(provider, userid, username, password, done){
	var self = this;
	var id = userid || uuid.v1()

	function makekey(arr){
		return arr.join('~')
	}

	function runbatch(batch){
		self._db.batch(batch, function(err){
			self.emit('storage:batch', batch)
			done(err, id)
		})
	}

	var batch = [{
		type:'put',
		key:makekey(['user', provider, username]),
		value:id
	},{
		type:'put',
		key:makekey(['links', id, provider, username]),
		value:' '
	}]

	if(password){
		utils.cryptPassword(password, function(err, cpassword){
			if(err) return done(err)
			batch.push({
				type:'put',
				key:makekey(['password', id]),
				value:cpassword
			})
			runbatch(batch)
		})
	}
	else{
		runbatch(batch)
	}
}

Database.prototype.userId = function(provider, username, done){
	var key = ['user', provider, username].join('~')
	this._db.get(key, done)
}

Database.prototype.checkUsername = function(provider, username, done){
	this.userId(provider, username, function(err, id){
		if(err || !id){
			done(null, true)
		}
		else{
			done(null, false)
		}
	})
}

Database.prototype.loadPassword = function(username, done){
	var self = this;
	this.userId('local', username, function(err, id){
		if(!err && !id){
			err = 'no id found for username: ' + username
		}
		if(err) return done(err)
		var key = ['password', id].join('~')
		self._db.get(key, done)
	})
}

// local provider only
Database.prototype.checkPassword = function(username, password, done){
	var self = this;
	self.loadPassword(username, function(err, dbpassword){
		utils.comparePassword(password, dbpassword, done)
	})
}

Database.prototype.loadProfile = function(userid, done){
	var self = this;
	var key = ['profile', userid].join('~')
	self._db.get(key, function(err, profile){
		if(err) return done(err)
		if(!profile){
			profile = {
				id:userid
			}
		}
		if(typeof(profile)==='string'){
			profile = JSON.parse(profile)
		}
		done(null, profile)
	})
}

Database.prototype.saveProfile = function(userid, provider, data, done){
	var self = this;
	self.loadProfile(userid, function(err, profile){
		if(err) return done(err)
		profile[provider] = data
		var key = ['profile', userid].join('~')
		self.emit('storage:put', key, JSON.stringify(profile))
		self._db.put(key, JSON.stringify(profile), done)
	})
}

Database.prototype.connect = function(loggedInId, provider, data, done){

	var self = this;
	var profile = data.data
	var id = data.id
	var token = data.token
	var refreshtoken = data.refresh_token

	self.userId(provider, id, function(err, userid){
		if(loggedInId && userid && userid!=loggedInId){
			// the account is linked to another user
			return done('this account is linked to another user')
		}
		self.registerUser(provider, loggedInId, id, null, function(err, dbid){
			if(err) return done(err)
			done(null, dbid, data)
		})	
	})
}