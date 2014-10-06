var level    = require('level-test')()
var sublevel = require('level-sublevel')
var Gandalf = require('../')
var fs = require('fs')
var util = require('util')
var tape = require('tape')
var db = sublevel(level('gandalf--db'))
var server
var app

var gandalf = Gandalf(db)

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


tape('save a user', function (t) {

  gandalf._db.registerUser('local', null, 'rodney', 'apples', function(err, id){
    gandalf._db.userId('local', 'rodney', function(err, loadid){
      t.equal(loadid, id, 'the loaded id is the same as the added id')

      gandalf._db.saveProfile(loadid, 'local', {
        name:'bob'
      }, function(err){
        t.error(err, 'save profile')
        gandalf._db.loadProfile(loadid, function(err, profile){
          t.equal(profile.id, loadid, 'id=loadid')
          t.equal(profile.local.name, 'bob', 'name is bob')
          gandalf.close()
          t.end()    
        })
      })
      
    })
  })

})