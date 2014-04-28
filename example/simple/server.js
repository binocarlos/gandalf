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

if(!process.env.TWITTER_ID){
  console.error('TWITTER_ID var needed')
  process.exit(1)
}

if(!process.env.TWITTER_SECRET){
  console.error('TWITTER_SECRET var needed')
  process.exit(1)
}

var db = sublevel(level('gandalf-examples--simple', {encoding: 'json'}))

var gandalf = Gandalf(db, {
  providers:{
    facebook:{
      id:process.env.FACEBOOK_ID,
      secret:process.env.FACEBOOK_SECRET
    },
    twitter:{
      id:process.env.TWITTER_ID,
      secret:process.env.TWITTER_SECRET
    }
  }
})

gandalf.on('batch', function(b){
  console.log('-------------------------------------------')
  console.log('batch')
  console.dir(b)
})

var users = {}
gandalf.on('save', function(provider, data){
  var user = users[data.id] || {}
  user[provider] = data
  users[data.id] = user
})

// create a server and mount the handler anywhere you want
app = express()
server = http.createServer(app)

// enable sessions for req & res
app.use(gandalf.session())

// enables users to login using '/auth/facebook' for example
app.use('/auth', gandalf.handler())

app.use('/private', gandalf.protect())
app.use(ecstatic(__dirname + '/www'))

server.listen(80, function(){
  console.log('server listening');
})