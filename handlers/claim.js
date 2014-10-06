var concat = require('concat-stream')
module.exports = function(req, res){
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