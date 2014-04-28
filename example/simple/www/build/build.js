
/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module._resolving && !module.exports) {
    var mod = {};
    mod.exports = {};
    mod.client = mod.component = true;
    module._resolving = true;
    module.call(this, mod.exports, require.relative(resolved), mod);
    delete module._resolving;
    module.exports = mod.exports;
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (require.modules.hasOwnProperty(path)) return path;
    if (require.aliases.hasOwnProperty(path)) return require.aliases[path];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!require.modules.hasOwnProperty(from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return require.modules.hasOwnProperty(localRequire.resolve(path));
  };

  return localRequire;
};
require.register("binocarlos-shadowfax/index.js", function(exports, require, module){
var templates = {
  login:require('./login'),
  register:require('./register'),
  accountdetails:require('./accountdetails'),
  claim:require('./claim'),
  combo:require('./combo')
}

var modulename = module.exports = 'shadowfax'

angular
	.module(modulename, [
    
  ])

  .directive('shadowfaxLogin', function(){

    return {
      restrict:'EA',
      scope:{
        success:'=',
        endpoint:'='
      },
      replace:true,
      template:templates.login,
      controller:function($scope){

      },
      link: function($scope, $elem, $attr) {
        
      }
    }
  })


  .directive('shadowfaxRegister', function(){

    return {
      restrict:'EA',
      scope:{
        success:'=',
        endpoint:'='
      },
      replace:true,
      template:templates.register,
      controller:function($scope){
        
      },
      link: function($scope, $elem, $attr) {
        
      }
    }
  })


  .directive('shadowfaxCombo', function(){

    return {
      restrict:'EA',
      scope:{
        success:'=',
        login_endpoint:'=',
        register_endpoint:'='
      },
      replace:true,
      template:templates.combo,
      controller:function($scope){
        
      },
      link: function($scope, $elem, $attr) {
        
      }
    }
  })


  .directive('shadowfaxAccountDetails', function(){

    return {
      restrict:'EA',
      scope:{
        success:'=',
        endpoint:'='
      },
      replace:true,
      template:templates.accountdetails,
      controller:function($scope){
        
      },
      link: function($scope, $elem, $attr) {
        
      }
    }
  })

});
require.register("binocarlos-shadowfax/accountdetails.js", function(exports, require, module){
module.exports = '<div class="row">\n  <div class="col-sm-12">\n    <div class="well">\n      <form class="form-horizontal" name="detailsForm" role="form">\n  \n        <div class="form-group" ng-class="{error: showdetailsvalidate && detailsForm.username.$invalid}">\n          <label for="Username" class="col-md-2 control-label">Username</label>\n          <div class="col-md-8">\n            <input type="text" class="form-control" readonly id="username" name="username" placeholder="" class="input-xlarge" ng-model="account.username" required>\n            <span ng-show="showdetailsvalidate && detailsForm.username.$error.required" class="help-inline">Required</span>\n          </div>\n        </div>\n        <div class="form-group" ng-class="{error: showdetailsvalidate && detailsForm.password.$invalid}">\n          <label for="Password" class="col-md-2 control-label">Password</label>\n          <div class="col-md-8">\n            <input type="text" class="form-control" id="password" name="password" placeholder="" class="input-xlarge" ng-model="account._password" required>\n            <span ng-show="showdetailsvalidate && detailsForm.password.$error.required" class="help-inline">Required</span>\n          </div>\n        </div>\n\n        <div class="form-group" ng-class="{error: showdetailsvalidate && detailsForm.fullname.$invalid}">\n          <label for="fullname" class="col-md-2 control-label">Full Name</label>\n          <div class="col-md-8">\n            <input type="text" class="form-control" id="fullname" name="fullname" placeholder="" class="input-xlarge" ng-model="account.fullname" required>\n            <span ng-show="showdetailsvalidate && detailsForm.fullname.$error.required" class="help-inline">Required</span>\n          </div>\n        </div>\n\n        <div class="form-group" ng-class="{error: showdetailsvalidate && detailsForm.email.$invalid}">\n          <label for="email" class="col-md-2 control-label">Email</label>\n          <div class="col-md-8">\n            <input type="email" class="form-control" id="email" name="email" placeholder="" class="input-xlarge" ng-model="account.email" required>\n            <span ng-show="showdetailsvalidate && detailsForm.email.$error.required" class="help-inline">Email & Required</span>\n          </div>\n        </div>\n\n        \n        <div class="form-group">\n          <div class="col-md-offset-2 col-md-8">\n           <button class="btn btn-success" ng-click="detailssubmit();">Save</button>\n          </div>\n        </div>\n      </form>\n    \n    </div>\n\n  </div>\n</div>\n';
});
require.register("binocarlos-shadowfax/claim.js", function(exports, require, module){
module.exports = '<div class="row">\n  <div class="col-md-12">\n      \n    <h4>Claim your username</h4>\n\n    <p>Type the name you want to use - your profile will live under this name.</p>\n\n    <p class="well">\n      {{ claimhost }}/{{ login.connect_username }}\n    </p>\n\n    <form class="form-horizontal" name="loginForm" role="form">\n\n      <div class="form-group">\n        <label for="username" class="col-md-2 control-label">Username</label>\n        <div class="col-md-8">\n          <input type="text" class="form-control" id="username" name="username" placeholder="Username" ng-model="login.connect_username" required>\n        </div>\n      </div>\n\n      <div ng-show="updateusername_message" class="help-inline" style="margin-bottom:10px;"><div class="label label-info">{{ updateusername_message }}</div></div>\n\n      <div class="form-group" ng-show="usernameok">\n        <div class="col-md-offset-2 col-md-8">\n          <button type="submit" class="btn btn-default" hm-tap="saveusername();">Update username</button>\n        </div>\n      </div>\n    </form>\n\n  </div>\n</div>';
});
require.register("binocarlos-shadowfax/combo.js", function(exports, require, module){
module.exports = '<div>\n  <ul class="nav nav-tabs" id="loginFormTab">\n    <li ng-class="{active:mode==\'login\'}"><a href="#" ng-click="setmode(\'login\')">Login</a></li>\n    <li ng-hide="loginonly" ng-class="{active:mode==\'register\'}"><a href="#" ng-click="setmode(\'register\')">Create Account</a></li>\n  </ul>\n  <div id="myTabContent" class="tab-content">\n\n    <div ng-class="{active:mode==\'login\', in:mode==\'login\', fade:mode!=\'login\'}" class="tab-pane" id="login" style="margin-top:20px;">\n\n        <shadowfax-login success="success" endpoint="login_endpoint" providers="login_providers" />\n    </div>\n\n    <divng-class="{active:mode==\'register\', in:mode==\'register\', fade:mode!=\'register\'}" class="tab-pane" id="register" style="margin-top:20px;">\n\n        <shadowfax-register success="success" endpoint="register_endpoint" />\n    </div>\n  </div>\n</div>';
});
require.register("binocarlos-shadowfax/login.js", function(exports, require, module){
module.exports = '<form class="form-horizontal" name="loginForm" role="form">\n\n  <div class="form-group" ng-class="{error: showloginvalidate && loginForm.username.$invalid}">\n    <label for="inputEmail1" class="col-md-2 control-label">Email</label>\n    <div class="col-md-8">\n      <input type="text" class="form-control" id="username" name="username" placeholder="Email" ng-model="login.username" required>\n    </div>\n  </div>\n  <div class="form-group" ng-class="{error: showloginvalidate && loginForm.password.$invalid}">\n    <label for="inputPassword1" class="col-md-2 control-label">Password</label>\n    <div class="col-md-8">\n      <input type="password" class="form-control" id="password" name="password" placeholder="Password" ng-model="login.password" required>\n    </div>\n  </div>\n\n\n  <div ng-show="loginmessage" class="help-inline" style="margin-bottom:10px;"><div class="label label-danger">{{ loginmessage }}</div></div>\n  <div ng-show="postregistermessage" class="help-inline" style="margin-bottom:10px;"><div class="label label-info">{{ postregistermessage }}</div></div>\n\n  <div class="form-group">\n    <div class="col-md-offset-2 col-md-8">\n      <button type="submit" class="btn btn-default" ng-click="loginSubmit();">Sign in</button>\n    </div>\n  </div>\n</form>';
});
require.register("binocarlos-shadowfax/register.js", function(exports, require, module){
module.exports = '<form class="form-horizontal" name="registerForm" role="form">\n\n    <div class="form-group" ng-class="{error: showregistervalidate && registerForm.username.$invalid}">\n      <!-- Email -->\n      <label class="col-md-2 control-label"  for="username">Email</label>\n      <div class="col-md-8">\n        <input type="email" class="form-control" id="username" name="username" placeholder="Email" ng-model="register.username" required>\n      </div>\n    </div>\n\n    <div class="form-group" ng-class="{error: showregistervalidate && registerForm.password.$invalid}">\n      <!-- Password -->\n      <label class="col-md-2 control-label"  for="password">Password</label>\n      <div class="col-md-8">\n        <input type="password" class="form-control" id="password" name="password" placeholder="Password" ng-model="register.password" required>\n      </div>\n    </div>      \n\n    <div class="form-group" ng-class="{error: showregistervalidate && registerForm.password.$invalid}">\n      <!-- Password -->\n      <label class="col-md-2 control-label"  for="password2">Confirm</label>\n      <div class="col-md-8">\n        <input type="password" class="form-control" id="password2" name="password2" placeholder="Confirm Password" ng-model="register.password2" required>\n      </div>\n    </div>       \n\n\n    <div ng-show="registermessage" class="help-inline"><span class="label label-danger">{{ registermessage }}</span></div>\n\n    <div class="form-group">\n      <!-- Button -->\n      <div class="col-md-offset-2 col-md-8">\n        <button class="btn btn-default" ng-class="{disabled:isactive}" ng-click="registerSubmit();">Create</button>\n      </div>\n    </div>\n\n  </fieldset>\n\n</form>';
});
require.register("gandalf-example/app.js", function(exports, require, module){
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
});
require.alias("binocarlos-shadowfax/index.js", "gandalf-example/deps/shadowfax/index.js");
require.alias("binocarlos-shadowfax/accountdetails.js", "gandalf-example/deps/shadowfax/accountdetails.js");
require.alias("binocarlos-shadowfax/claim.js", "gandalf-example/deps/shadowfax/claim.js");
require.alias("binocarlos-shadowfax/combo.js", "gandalf-example/deps/shadowfax/combo.js");
require.alias("binocarlos-shadowfax/login.js", "gandalf-example/deps/shadowfax/login.js");
require.alias("binocarlos-shadowfax/register.js", "gandalf-example/deps/shadowfax/register.js");
require.alias("binocarlos-shadowfax/index.js", "gandalf-example/deps/shadowfax/index.js");
require.alias("binocarlos-shadowfax/index.js", "shadowfax/index.js");
require.alias("binocarlos-shadowfax/index.js", "binocarlos-shadowfax/index.js");
require.alias("gandalf-example/app.js", "gandalf-example/index.js");