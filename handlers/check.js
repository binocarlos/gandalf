var url = require('url')
module.exports = function(req, res){
	var self = this;
	var query = url.parse(req.url).query
	self._db.checkUsername('local', query.username, function(err, ok){
		var val = ok ? 'ok' : 'notok'
		self.emit('log', 'check', query, val)
		res.end(val)
	})
}