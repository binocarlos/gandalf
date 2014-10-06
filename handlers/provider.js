module.exports = function(req, res, match){
	var self = this;
	req.provider = match.params.provider
	
	this._makeProvider(match.params.provider, function(err, provider){
		if(provider){
			self.emit('log', 'provider:request', req.url)
			self.emit('provider', req.provider, req)
			provider.emit('request', req, res)	
		}
		else{
			res.statusCode = 404
			var err = 'provider: ' + match.params.provider + ' not found'
			self.emit('log', 'provider:error', err)
			res.end(err)
		}
		
	})
}