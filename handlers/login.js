var concat = require('concat-stream')
module.exports = function(req, res){
	var self = this;

	function returnError(e){
		res.statusCode = 500
		res.end(e.toString())
		return
	}

	req.pipe(concat(function(body){

		body = JSON.parse(body.toString())

		var username = body.username
		var password = body.password

		req.session.get('userid', function(err, id){
			if(id){
				res.statusCode = 500
				self.emit('log:error', 'login', 'already logged in')
				res.end('notok')
			}
			else{
				self._db.checkPassword(username, password, function(err, userid){
					if(!userid){
						err = 'incorrect details'
						self.emit('log:error', 'login', 'incorrect details')
					}
					if(err) return returnError(err)
					req.session.set('userid', userid, function(err){
						if(err) return returnError(err)
						res.statusCode = 200
						self.emit('log', 'login:ok', username)
						self.emit('login', username)
						res.end('ok')
					})
				})
			}
		})

	}))
}