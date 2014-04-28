var modulename = module.exports = 'gandalf-example'
angular.module(modulename, [
  require('shadowfax')
])
.controller('gandalf-ctrl', function($scope){
  console.log('-------------------------------------------');
  console.log('here!');
  $scope.login = {
    success:'/',
    endpoint:'/auth/login'
  }

  $scope.register = {
    success:'/',
    endpoint:'/auth/register'
  }
})