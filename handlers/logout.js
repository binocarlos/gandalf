var redirect = require('predirect')
module.exports = function(req, res){
	var self = this;
	req.session.destroy(function(){
		self.emit('log', 'logout:ok')
		self.emit('logout', req)
		redirect(req, res, '/')
	})
}