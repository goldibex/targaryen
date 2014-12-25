
'use strict';

var helpers = require('./test-helpers');

exports.setFirebaseData = helpers.setFirebaseData;
exports.setFirebaseRules = helpers.setFirebaseRules;
exports.users = helpers.userDefinitions;

exports.matchers = {

  canRead: function() {

    return { compare: function(auth, path) {

      var root = helpers.getFirebaseData(),
        rules = helpers.getFirebaseRules();

      var result = rules.tryRead(path, root, auth);

      return {
        pass: result.allowed === true,
        message: helpers.unreadableError(auth, result)
      };

    }};

  },
  cannotRead: function() {

    return { compare: function(auth, path) {

      var root = helpers.getFirebaseData(),
        rules = helpers.getFirebaseRules();

      var result = rules.tryRead(path, root, auth);

      return {
        pass: result.allowed === false,
        message: helpers.readableError(auth, result)
      };

    }};

  },
  canWrite: function() {

    return { compare: function(auth, path, data) {

      var root = helpers.getFirebaseData(),
        rules = helpers.getFirebaseRules(),
        newData = helpers.makeNewData(data);

      var result = rules.tryWrite(path, root, newData, auth);

      return {
        pass: result.allowed === true,
        message: helpers.unwritableError(auth, result, newData)
      };

    }};

  },
  cannotWrite: function() {

    return { compare: function(auth, path, data) {

      var root = helpers.getFirebaseData(),
        rules = helpers.getFirebaseRules(),
        newData = helpers.makeNewData(data);

      var result = rules.tryWrite(path, root, newData, auth);

      return {
        pass: result.allowed === false,
        message: helpers.writableError(auth, result, newData)
      };

    }};
  }

};
