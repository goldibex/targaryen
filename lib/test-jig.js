
'use strict';

var RuleDataSnapshot = require('./rule-data-snapshot'),
  Ruleset = require('./ruleset');


function TestJig(rules, testData, now) {
  now = now || Date.now();

  this.ruleset = new Ruleset(rules);
  this.root = new RuleDataSnapshot(RuleDataSnapshot.convert(testData.root, now), now);
  this.users = testData.users;
  this.tests = testData.tests;

}

TestJig.prototype._lookupAuth = function(auth) {

  if (this.users[auth] === null) {
    // Unauthenticated user
    auth = null;
  } else if (typeof auth === 'string') {
    var desc = auth;
    auth = this.users[desc];
    auth.$description = desc;
  }

  return auth;

};

TestJig.prototype.run = function() {

  var allResults = [];
  Object.keys(this.tests).forEach(function(path) {

    // strip initial forward slash from objects
    path = path.replace(/^\/+/g, '');

    var pathTests = this.tests[path];

    allResults = allResults
    .concat((pathTests.canRead || []).map(function(auth) {

      auth = this._lookupAuth(auth);
      var result = this.ruleset.tryRead(path, this.root, auth);
      result.expected = true;
      return result;

    }, this))
    .concat((pathTests.cannotRead || []).map(function(auth) {

      auth = this._lookupAuth(auth);

      var result = this.ruleset.tryRead(path, this.root, auth);
      result.expected = false;
      return result;

    }, this))
    .concat((pathTests.canWrite || []).map(function(writeTest) {

      var auth = this._lookupAuth(writeTest.auth);
      var result = this.ruleset.tryWrite(path, this.root, writeTest.data, auth);
      result.expected = true;
      result.newData = writeTest.data;
      return result;

    }, this))
    .concat((pathTests.cannotWrite || []).map(function(writeTest) {

      var auth = this._lookupAuth(writeTest.auth);

      var result = this.ruleset.tryWrite(path, this.root, writeTest.data, auth);
      result.expected = false;
      result.newData = writeTest.data;
      return result;

    }, this));

  }, this);

  return allResults;

};

module.exports = TestJig;
