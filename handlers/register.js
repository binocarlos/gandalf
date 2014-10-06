var concat = require('concat-stream')
module.exports = function(req, res){
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
						self.emit('save', userid, 'local', body)
						res.statusCode = 200;
						res.end('ok')
					})
				})
				
			})
		})
	}))
}
