var EventEmitter = require('events').EventEmitter
var util = require('util')
var uuid = require('node-uuid')
var utils = require('./utils')

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
Database.prototype.registerUser = function(installation, provider, username, password, done){
	var self = this;
	var id = uuid.v1()

	function makekey(arr){
		return [installation].concat(arr).join('~')
	}

	function runbatch(batch){
		self.emit('batch', batch)
		self._db.batch(batch, done)
	}

	var batch = [{
		type:'put',
		key:makekey(['user', provider, username]),
		value:id
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

Database.prototype.userId = function(installation, provider, username, done){
	var key = [installation, 'user', provider, username].join('~')
	this._db.get(key, done)
}

Database.prototype.checkUsername = function(installation, provider, username, done){
	this.userId(installation, provider, username, function(err, id){
		if(err || !id){
			done(null, true)
		}
		else{
			done(null, false)
		}
	})
}

Database.prototype.loadPassword = function(installation, username, done){
	var self = this;
	this.userId(installation, 'local', username, function(err, id){
		if(!err && !id){
			err = 'no id found for username: ' + installation + ' -> ' + username
		}
		if(err) return done(err)
		var key = [installation, 'password', id].join('~')
		self._db.get(key, done)
	})
}

// local provider only
Database.prototype.checkPassword = function(installation, username, password, done){
	var self = this;
	console.log('-------------------------------------------');
	console.log('check passowrd');
	console.dir(installation);
	console.dir(username);
	self.loadPassword(installation, username, function(err, dbpassword){
		console.log('-------------------------------------------');
		console.dir(dbpassword);
		utils.comparePassword(password, dbpassword, done)
	})	
}