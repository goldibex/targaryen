
'use strict';

var helpers = require('../util');

exports.setFirebaseData = helpers.setFirebaseData;
exports.setFirebaseRules = helpers.setFirebaseRules;
exports.users = helpers.users;

exports.matchers = {

  canRead: function() {

    return { compare: function(auth, path, now) {

      var data = helpers.getFirebaseData().as(auth);

      var result = data.read(path, now);

      return {
        pass: result.allowed === true,
        message: helpers.unreadableError(result)
      };

    }};

  },
  cannotRead: function() {

    return { compare: function(auth, path, now) {

      var data = helpers.getFirebaseData().as(auth);

      var result = data.read(path, now);

      return {
        pass: result.allowed === false,
        message: helpers.readableError(result)
      };

    }};

  },
  canWrite: function() {

    return { compare: function(auth, path, newData, now) {

      var data = helpers.getFirebaseData().as(auth);

      var result = data.write(path, newData, now);

      return {
        pass: result.allowed === true,
        message: helpers.unwritableError(result)
      };

    }};

  },
  cannotWrite: function() {

    return { compare: function(auth, path, newData, now) {

      var data = helpers.getFirebaseData().as(auth);

      var result = data.write(path, newData, now);

      return {
        pass: result.allowed === false,
        message: helpers.writableError(result)
      };

    }};
  },
  canPatch: function() {

    return { compare: function(auth, path, newData, now) {

      var data = helpers.getFirebaseData().as(auth);

      var result = data.update(path, newData, now);

      return {
        pass: result.allowed === true,
        message: helpers.unwritableError(result)
      };

    }};

  },
  cannotPatch: function() {

    return { compare: function(auth, path, newData, now) {

      var data = helpers.getFirebaseData().as(auth);

      var result = data.update(path, newData, now);

      return {
        pass: result.allowed === false,
        message: helpers.writableError(result)
      };

    }};
  }

};
