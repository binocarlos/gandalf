var url = require('url')
var hyperquest = require('hyperquest')
var concat = require('concat-stream')
var util = require('util')
var EventEmitter = require('events').EventEmitter

function OAuth2(options){

  // This option is necessary when the Oauth service has a self-signed cert.
  // Hopefully this is only set to false in the safety of testing but not out in the wild.
  this.rejectUnauthorizedRequests = !(options && options.rejectUnauthorized == false);

  EventEmitter.call(this);
}

util.inherits(OAuth2, EventEmitter);

OAuth2.prototype.parseURI = function(request) {
  var proto = (request.headers["x-forwarded-proto"] || "").toLowerCase()
    , secure = request.connection.encrypted || proto == "https"
    , protocol = secure ? "https" : "http"
    , host = request.headers.host || request.connection.remoteAddress

  return url.parse(protocol + "://" + host + request.url, true)
}

// transport
OAuth2.prototype.request = function(original, cb) {
  var request = {}
  for (var key in original) request[key] = original[key]

  request.query = url.format({query: request.query})

  request.method || (request.method = "GET")

  var body = null;
  if (request.method == "GET") {
    request.path += request.query
    request.headers || (request.headers = {})
    request.headers["User-Agent"] = "authom/0.4";
  }

  else {
    body = request.query.slice(1)
    request.headers || (request.headers = {})
    request.headers["Content-Length"] = Buffer.byteLength(request.body)
    request.headers["Content-Type"] = "application/x-www-form-urlencoded"
    request.headers["User-Agent"] = "authom/0.4";
  }

  request.rejectUnauthorized = this.rejectUnauthorizedRequests;

  var req = hyperquest(request)

  req.pipe(concat(function(data){
    try { data = JSON.parse(data) }
    catch (e) { data = url.parse("?" + data, true).query }

    response.statusCode == 200 ? cb(null, data) : cb(data)
  }))

  req.on('error', function(err){
    cb(err)
  })

  if(body){
    req.end(body)
  }
}

// request router
OAuth2.prototype.onRequest = function(req, res) {
  var uri = req.url = this.parseURI(req)

  if (uri.query.error) this.emit("error", req, res, uri.query)

  else if (uri.query.code) this.onCode(req, res)

  else this.onStart(req, res)
}

// kick things off by sending the browser to the auth login screen (@ google or whoever)
OAuth2.prototype.onStart = function(req, res) {
  this.code.query.redirect_uri = url.format(req.url)

  res.writeHead(302, {Location: url.format(this.code)})
  res.end()
}

// we gave got a code back from the remote login loop
OAuth2.prototype.onCode = function(req, res) {
  this.token.query.code = req.url.query.code

  delete req.url.query
  delete req.url.search

  this.token.query.redirect_uri = url.format(req.url)

  this.request(this.token, function(err, data) {
    if (err) return this.emit("error", req, res, err)

    var tokenKey = this.user.tokenKey || "access_token"

    this.user.query[tokenKey] = data.access_token

    this.request(this.user, function(err, user) {
      if (err) return this.emit("error", req, res, err)

      data = {
        token: data.access_token,
        refresh_token: data.refresh_token,
        id: this.getId(user),
        data: user
      }

      this.emit("auth", req, res, data)
    }.bind(this))
  }.bind(this))
}

OAuth2.prototype.getId = function(data){ return data.id }

module.exports = OAuth2
