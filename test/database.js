var http = require('http')
var express = require('express')
var level    = require('level-test')()
var sublevel = require('level-sublevel')
var Gandalf = require('../')
var ecstatic = require('ecstatic')
var fs = require('fs')
var util = require('util')
var NightmareTape = require('nightmare-tape')

var db = sublevel(level('gandalf--db'))
var server
var app
var gandalf
var browser

var serverState = {}

function ServerFactory(done){
  gandalf = Gandalf(db)

  gandalf.on('batch', function(b){
    console.log('-------------------------------------------')
    console.log('batch')
    console.dir(b)
  })

  gandalf.on('save', function(userid, data){
    serverState.savedUser = data
  })
  done()
}

function CloseServer(done){
  done()
}

NightmareTape(ServerFactory, CloseServer, function(err, tape){

  tape('save a user', function (t) {

    gandalf._db.registerUser('default', 'local', null, 'rodney', 'apples', function(err, id){
      gandalf._db.userId('default', 'local', 'rodney', function(err, loadid){
        t.equal(loadid, id)
        t.end()
      })
    })
  })

  tape.shutdown()
})