var http = require('http')
var level    = require('level-test')()
var sublevel = require('level-sublevel')
var Gandalf = require('../')
var Router = require('routes-router')
var mount = require('routes-router-mount')
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

function ServerFactory(done){
  gandalf = Gandalf(db)

  gandalf.on('log', function(type, message){
    console.log('log:' + type + ' ' + message)
  })

  gandalf.on('log:error', function(type, message){
    console.error('log:error:' + type + ' ' + message)
  })

  gandalf.on('storage:batch', function(b){
    console.log('-------------------------------------------')
    console.log('batch')
    console.dir(b)
  })

  gandalf.on('storage:put', function(key, value){
    console.log('-------------------------------------------')
    console.log('put')
    console.dir(key)
    console.dir(value)
  })


  gandalf.on('save', function(userid, provider, data){
    console.log('-------------------------------------------');
    console.log('save')
    console.dir(userid)
    console.dir(provider)
    console.dir(data)
    serverState.savedUser = data
  })

  app = mount(Router())

  server = http.createServer(app)

  // enables users to login using '/auth/facebook' for example
  var handler = gandalf.handler()
  app.mount('/auth', gandalf.handler())

  app.addRoute('/private/*', gandalf.protect(ecstatic(__dirname + '/www')))
  
  // the logged in or not branch
  app.addRoute('/', gandalf.session(function(req, res){
    res.setHeader('Content-Type', 'text/html')
    req.session.get('userid', function(err, id){
      if(!err && id){
        fs.createReadStream(__dirname + '/www/admin.html').pipe(res)
      }
      else{
        fs.createReadStream(__dirname + '/www/index.html').pipe(res)
      }
    })
  }))

  app.addRoute('/*', ecstatic(__dirname + '/www'))

  server.listen(8089, function(){
    console.log('server listening');
    done()
  })
}

function CloseServer(done){
  server.close()
  gandalf.close()
  done()
}

NightmareTape(ServerFactory, CloseServer, function(err, tape){

  var logoutCount = 0
  function logout(){

    logoutCount++

    tape('logout ' + logoutCount, function (t) {

      tape.browser
        .goto('http://127.0.0.1:8089/auth/logout')
        .run(function (err, nightmare) {
          t.end()
        })
    })
  }

  tape('access denied for private (WILL SHOW AN ERROR)', function (t) {

    var browserState = {}
    tape.browser
      .goto('http://127.0.0.1:8089/private')
      .wait(1000)
      .evaluate('confirmProtected', function(val){
        browserState.protectedreply = val
      })
      .run(function (err, nightmare) {

        t.equal(browserState.protectedreply, null)
        t.end()
        
        
      });
  })

  tape('register new account', function (t) {


    var browserState = {}
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
        t.equal(browserState.reply, 'ok')
        t.end()
      });
  })

  
  tape('access OK for private', function (t) {

    var browserState = {}
    tape.browser
      .goto('http://127.0.0.1:8089/private')
      .wait(1000)
      .evaluate('confirmProtected', function(val){
        browserState.protectedreply = val
      })
      .run(function (err, nightmare) {

        t.equal(browserState.protectedreply, 'peaches')
        t.end()
        
        
      });
  })

  logout()

  tape('account exists in check', function (t) {

    var browserState = {}
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

    var browserState = {}
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

    var browserState = {}
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

    var browserState = {}
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



  tape('access OK for private', function (t) {

    var browserState = {}
    tape.browser
      .goto('http://127.0.0.1:8089/private')
      .wait(1000)
      .evaluate('confirmProtected', function(val){
        browserState.protectedreply = val
      })
      .run(function (err, nightmare) {

        t.equal(browserState.protectedreply, 'peaches')
        t.end()
        
        
      });
  })



  tape('logout', function (t) {

    var browserState = {}
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