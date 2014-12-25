
'use strict';

var helpers = require('./lib/test-helpers');

module.exports = {
  setFirebaseData: helpers.setFirebaseData,
  setFirebaseRules: helpers.setFirebaseRules,
  setDebug: helpers.setDebug,
  users: helpers.userDefinitions,
  chai: require('./lib/chai'),
  jasmine: require('./lib/jasmine')
};
