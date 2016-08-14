
'use strict';

var helpers = require('./test-helpers');

exports.setFirebaseData = helpers.setFirebaseData;
exports.setFirebaseRules = helpers.setFirebaseRules;
exports.users = helpers.userDefinitions;

exports.matchers = {

  canRead: function() {

    return { compare: function(auth, path, now) {

      var root = helpers.getFirebaseData(),
        rules = helpers.getFirebaseRules();

      var result = rules.tryRead(path, root, auth, now);

      return {
        pass: result.allowed === true,
        message: helpers.unreadableError(result)
      };

    }};

  },
  cannotRead: function() {

    return { compare: function(auth, path, now) {

      var root = helpers.getFirebaseData(),
        rules = helpers.getFirebaseRules();

      var result = rules.tryRead(path, root, auth, now);

      return {
        pass: result.allowed === false,
        message: helpers.readableError(result)
      };

    }};

  },
  canWrite: function() {

    return { compare: function(auth, path, newData, now) {

      var root = helpers.getFirebaseData(),
        rules = helpers.getFirebaseRules();

      var result = rules.tryWrite(path, root, newData, auth, false, false, false, now);

      return {
        pass: result.allowed === true,
        message: helpers.unwritableError(result)
      };

    }};

  },
  cannotWrite: function() {

    return { compare: function(auth, path, newData, now) {

      var root = helpers.getFirebaseData(),
        rules = helpers.getFirebaseRules();

      var result = rules.tryWrite(path, root, newData, auth, false, false, false, now);

      return {
        pass: result.allowed === false,
        message: helpers.writableError(result)
      };

    }};
  },
  canPatch: function() {

    return { compare: function(auth, path, newData, now) {

      var root = helpers.getFirebaseData(),
        rules = helpers.getFirebaseRules();

      var result = rules.tryPatch(path, root, newData, auth, false, false, false, now);

      return {
        pass: result.allowed === true,
        message: helpers.unwritableError(result)
      };

    }};

  },
  cannotPatch: function() {

    return { compare: function(auth, path, newData, now) {

      var root = helpers.getFirebaseData(),
        rules = helpers.getFirebaseRules();

      var result = rules.tryPatch(path, root, newData, auth, false, false, false, now);

      return {
        pass: result.allowed === false,
        message: helpers.writableError(result)
      };

    }};
  }

};
