var concat = require('concat-stream')
module.exports = function(req, res){
	var self = this;
	req.session.get('userid', function(err, id){
		if(err){
			res.statusCode = 500
			res.end(err)
			return
		}
		if(!id){
			res.statusCode = 404
			res.end('not logged in')
			return
		}
		self._db.loadProfile(id, function(err, profile){
			if(err){
				res.statusCode = 500
				res.end(err)
				return
			}	
			res.end(JSON.stringify(profile))
		})
  })
}