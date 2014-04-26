var EventEmitter = require('events').EventEmitter
var util = require('util')

function Database(db, opts){
	var self = this;
	EventEmitter.call(this)

	this._db = db
	this.opts = opts || {}
}

util.inherits(Database, EventEmitter)

module.exports = Database

Database.prototype.usernameExists = function(appid, username, done){

}

Database.prototype.loadProviderUser = function(appid, provider, id, done){

}

Database.prototype.registerUser = function(appid, username, password, done){

}

Database.prototype.checkPassword = function(appid, username, password, done){

}

Database.prototype.checkPassword = function(username, password, done){

}