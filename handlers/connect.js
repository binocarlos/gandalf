var Extractors = require('../extractors')
module.exports = function(req, res, provider, data){
	var self = this;
	
	req.session.get('userid', function(err, loggedInId){

		if(!loggedInId){
			res.statusCode = 500
			res.end('not logged in')
			self.emit('log:error', 'connect', 'not logged in')
			return
		}

		self.emit('log', 'connect', loggedInId)

		self._db.connect(loggedInId, req.provider, data, function(err, userid, data){
			if(err){
				res.statusCode = 500
				res.end(err)
				self.emit('log:error', 'connect', err)
				return
			}
			req.session.set('userid', userid, function(){
				if(err){
					res.statusCode = 500
					res.end(err)
					self.emit('log:error', 'session', err)
					return
				}
				Extractors[req.provider](provider, data, function(err, profile){
					if(err){
						res.statusCode = 500
						res.end(err)
						self.emit('log:error', 'extractor', err)
						return
					}

					profile.id = userid
					self._db.saveProfile(userid, req.provider, profile, function(err){
						if(err){
							res.statusCode = 500
							res.end(err)
							self.emit('log:error', 'saveprofile', err)
							return
						}
						self.emit('save', userid, req.provider, profile)
						self.emit('connect', req.provider, profile)
						self.emit('log', 'connect:profile', profile)
						res.redirect('/')
					})
				})
			})
		})
	})
}