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

// default~user~local~binocarlos = 123-123-123
// default~password~123-123-123 = DjhkdfjKHJNdfkhDf
Database.prototype.registerUser = function(installationid, provider, userid, username, password, done){
	var self = this;
	var id = userid || uuid.v1()

	function makekey(arr){
		return [installationid].concat(arr).join('~')
	}

	function runbatch(batch){
		self._db.batch(batch, function(err){
			self.emit('batch', batch)
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

Database.prototype.userId = function(installationid, provider, username, done){
	var key = [installationid, 'user', provider, username].join('~')
	this._db.get(key, done)
}

Database.prototype.checkUsername = function(installationid, provider, username, done){
	this.userId(installationid, provider, username, function(err, id){
		if(err || !id){
			done(null, true)
		}
		else{
			done(null, false)
		}
	})
}

Database.prototype.loadPassword = function(installationid, username, done){
	var self = this;
	this.userId(installationid, 'local', username, function(err, id){
		if(!err && !id){
			err = 'no id found for username: ' + installation + ' -> ' + username
		}
		if(err) return done(err)
		var key = [installationid, 'password', id].join('~')
		self._db.get(key, done)
	})
}

// local provider only
Database.prototype.checkPassword = function(installationid, username, password, done){
	var self = this;
	self.loadPassword(installationid, username, function(err, dbpassword){
		utils.comparePassword(password, dbpassword, done)
	})
}

Database.prototype.connect = function(installationid, loggedInId, provider, data, done){

	var self = this;
	var profile = data.data
	var id = data.id
	var token = data.token
	var refreshtoken = data.refresh_token

	self.userId(installationid, provider, id, function(err, userid){
		if(loggedInId && userid && userid!=loggedInId){
			// the account is linked to another user
			return done('this account is linked to another user')
		}
		self.registerUser(installationid, provider, loggedInId, id, null, function(err, dbid){
			if(err) return done(err)
			done(null, dbid, data)
		})	
	})
}