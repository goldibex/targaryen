/**
 * targaryen cli command.
 *
 * Rule tests are define via a JSON object listing operations to simulate
 * against an initial data and authentication states.
 */

'use strict';

const database = require('./database');
const paths = require('./paths');

function TestJig(rules, testData, now) {
  now = now || Date.now();

  this.db = database.create(rules, testData.root, now);
  this.users = testData.users;
  this.tests = testData.tests;

}

TestJig.prototype._lookupAuth = function(auth) {

  if (this.users[auth] === null) {
    // Unauthenticated user
    return null;
  }

  if (typeof auth !== 'string') {
    return auth;
  }

  const desc = auth;

  auth = this.users[desc];
  auth.$description = desc;

  return auth;

};

TestJig.prototype.run = function() {

  let allResults = [];

  Object.keys(this.tests).forEach(function(path) {

    path = paths.trimLeft(path);

    const pathTests = this.tests[path];
    const canRead = (pathTests.canRead || []).map(auth => {
      const result = this.db
        .as(this._lookupAuth(auth))
        .read(path);

      result.expected = true;

      return result;
    });
    const cannotRead = (pathTests.cannotRead || []).map(auth => {
      const result = this.db
        .as(this._lookupAuth(auth))
        .read(path);

      result.expected = false;

      return result;
    });
    const canWrite = (pathTests.canWrite || []).map(writeTest => {
      const result = this.db
        .as(this._lookupAuth(writeTest.auth))
        .write(path, writeTest.data);

      result.expected = true;

      return result;
    });
    const cannotWrite = (pathTests.cannotWrite || []).map(writeTest => {
      const result = this.db
        .as(this._lookupAuth(writeTest.auth))
        .write(path, writeTest.data);

      result.expected = false;

      return result;
    });

    allResults = allResults.concat(canRead, cannotRead, canWrite, cannotWrite);

  }, this);

  return allResults;

};

module.exports = TestJig;
