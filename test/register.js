var http = require('http')
var express = require('express')
var level    = require('level-test')()
var sublevel = require('level-sublevel')
var Gandalf = require('../')
var ecstatic = require('ecstatic')
var fs = require('fs')
var util = require('util')
var NightmareTape = require('nightmare-tape')

var db = sublevel(level('gandalf--register', {encoding: 'utf8'}))
var server
var app
var gandalf
var browser

var serverState = {}
var browserState = {}

function ServerFactory(done){
  gandalf = Gandalf(db, {
    path:'/auth',
    providers:{
      local:true
    }
  })

  gandalf.on('batch', function(b){
    console.log('-------------------------------------------')
    console.log('batch')
    console.dir(b)
  })

  gandalf.on('save', function(data){
    serverState.savedUser = data
  })

  // create a server and mount the handler anywhere you want
  app = express()
  server = http.createServer(app)

  // enable sessions for req & res
  app.use(gandalf.session())

  // enables users to login using '/auth/facebook' for example
  app.use('/auth', gandalf.handler())

  // the logged in or not branch
  app.get('/', function(req, res){
    res.setHeader('Content-Type', 'text/html')
    req.session.get('userid', function(err, id){
      if(!err && id){
        fs.createReadStream(__dirname + '/www/admin.html').pipe(res)
      }
      else{
        fs.createReadStream(__dirname + '/www/index.html').pipe(res)
      }
    })
  })

  app.use(ecstatic(__dirname + '/www'))

  server.listen(8089, function(){
    console.log('server listening');
    done()
  })
}

function CloseServer(done){
  server.close()
  done()
}

NightmareTape(ServerFactory, CloseServer, function(err, tape){
  tape('register new account', function (t) {

    tape.browser
      .goto('http://127.0.0.1:8089')
      .type('input#registerusername', 'rodney')
      .type('input#registeremail', 'rodney@test.com')
      .type('input#registerpassword', 'apples')
      .click('button#register')
      .wait(1000)
      .evaluate('getRegisterReply', function(val){
        browserState.reply = val
      })
      .run(function (err, nightmare) {
        t.equal(serverState.savedUser.username, 'rodney')
        t.equal(serverState.savedUser.email, 'rodney@test.com')
        t.equal(serverState.savedUser.installationid, 'default')
        t.equal(browserState.reply, 'ok')
        t.end()
      });
  })

  tape('account exists in check', function (t) {

    tape.browser
      .goto('http://127.0.0.1:8089')
      .type('input#registerusername', 'rodney')
      .type('input#registeremail', 'rodney@test.com')
      .type('input#registerpassword', 'apples')
      .click('button#register')
      .wait(1000)
      .evaluate('getRegisterReply', function(val){
        browserState.reply = val
      })
      .run(function (err, nightmare) {
        t.equal(browserState.reply, 500)
        t.end()
      });
  })


  tape('login with wrong password', function (t) {

    tape.browser
      .goto('http://127.0.0.1:8089')
      .type('input#loginusername', 'rodney')
      .type('input#loginpassword', 'apples2')
      .click('button#login')
      .wait(1000)
      .evaluate('getLoginReply', function(val){
        browserState.loginreply = val
      })
      .run(function (err, nightmare) {        
        t.equal(browserState.loginreply, 500)
        t.end()
      });
  })

  tape('login with correct password', function (t) {

    tape.browser
      .goto('http://127.0.0.1:8089')
      .type('input#loginusername', 'rodney')
      .type('input#loginpassword', 'apples')
      .click('button#login')
      .wait(1000)
      .evaluate('getLoginReply', function(val){
        browserState.loginreply = val
      })
      .run(function (err, nightmare) {
        t.equal(browserState.loginreply, 'ok')
        t.end()
      });
  })


  tape('login with session', function (t) {

    tape.browser
      .goto('http://127.0.0.1:8089')
      .wait(100)
      .evaluate('confirmAdmin', function(val){
        browserState.loggedinStatus = val
      })
      .run(function (err, nightmare) {
        t.equal(browserState.loggedinStatus, 'pears')
        t.end()
      });
  })


  tape('logout', function (t) {

    tape.browser
      .goto('http://127.0.0.1:8089/auth/logout')
      .run(function (err, nightmare) {
        tape.browser
        .goto('http://127.0.0.1:8089')
        .wait(100)
        .evaluate('confirmAdmin', function(val){
          browserState.notloggedinStatus = val
        })
        .run(function (err, nightmare) {
          console.dir(browserState);
          t.equal(browserState.notloggedinStatus, 'notpears')
          t.end()
        })
      })
  })

  tape.shutdown()
})