
'use strict';

var helpers = require('./lib/test-helpers');

module.exports = {
  setFirebaseData: helpers.setFirebaseData,
  setFirebaseRules: helpers.setFirebaseRules,
  setDebug: helpers.setDebug,
  users: helpers.users,
  utils: helpers,
  chai: require('./lib/chai'),
  jasmine: require('./lib/jasmine'),
};
