var http = require('http')
var express = require('express')
var level    = require('level-test')()
var sublevel = require('level-sublevel')
var Gandalf = require('../../')
var ecstatic = require('ecstatic')
var fs = require('fs')

if(!process.env.FACEBOOK_ID){
  console.error('FACEBOOK_ID var needed')
  process.exit(1)
}

if(!process.env.FACEBOOK_SECRET){
  console.error('FACEBOOK_SECRET var needed')
  process.exit(1)
}

var users = {}

var db = sublevel(level('gandalf-examples--simple', {encoding: 'json'}))

var gandalf = Gandalf(db, {
  path:'/auth',
  providers:{    
    facebook:{
      id:process.env.FACEBOOK_ID,
      secret:process.env.FACEBOOK_SECRET
    }
  }
})

gandalf.on('batch', function(b){
  console.log('-------------------------------------------')
  console.log('batch')
  console.dir(b)
})

gandalf.on('save', function(data){
  users[data.id] = data
})

// create a server and mount the handler anywhere you want
app = express()
server = http.createServer(app)

// enable sessions for req & res
app.use(gandalf.session())

// enables users to login using '/auth/facebook' for example
app.use('/auth', gandalf.handler())

app.use('/status', function(req, res){
  req.session.get('userid', function(err, id){
    var user = users[id]
    res.end(JSON.stringify(user))
  })
})

// the logged in or not branch
app.get('/', function(req, res){
  res.setHeader('Content-Type', 'text/html')
  req.session.get('userid', function(err, id){
    if(!err && id){
      fs.createReadStream(__dirname + '/www/home.html').pipe(res)
    }
    else{
      fs.createReadStream(__dirname + '/www/index.html').pipe(res)
    }
  })
})

app.use(ecstatic(__dirname + '/www'))

server.listen(80, function(){
  console.log('server listening');
})