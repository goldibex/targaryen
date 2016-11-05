
'use strict';

var targaryen = require('../');

exports.setFirebaseData = targaryen.util.setFirebaseData;
exports.setFirebaseRules = targaryen.util.setFirebaseRules;
exports.setDebug = targaryen.util.setDebug;
exports.users = targaryen.util.users;

exports.matchers = {

  canRead: function() {

    return { compare: function(auth, path, now) {

      var data = targaryen.util.getFirebaseData().as(auth);

      var result = data.read(path, now);

      return {
        pass: result.allowed === true,
        message: targaryen.util.unreadableError(result)
      };

    }};

  },
  cannotRead: function() {

    return { compare: function(auth, path, now) {

      var data = targaryen.util.getFirebaseData().as(auth);

      var result = data.read(path, now);

      return {
        pass: result.allowed === false,
        message: targaryen.util.readableError(result)
      };

    }};

  },
  canWrite: function() {

    return { compare: function(auth, path, newData, now) {

      var data = targaryen.util.getFirebaseData().as(auth);

      var result = data.write(path, newData, now);

      return {
        pass: result.allowed === true,
        message: targaryen.util.unwritableError(result)
      };

    }};

  },
  cannotWrite: function() {

    return { compare: function(auth, path, newData, now) {

      var data = targaryen.util.getFirebaseData().as(auth);

      var result = data.write(path, newData, now);

      return {
        pass: result.allowed === false,
        message: targaryen.util.writableError(result)
      };

    }};
  },
  canPatch: function() {

    return { compare: function(auth, path, newData, now) {

      var data = targaryen.util.getFirebaseData().as(auth);

      var result = data.update(path, newData, now);

      return {
        pass: result.allowed === true,
        message: targaryen.util.unwritableError(result)
      };

    }};

  },
  cannotPatch: function() {

    return { compare: function(auth, path, newData, now) {

      var data = targaryen.util.getFirebaseData().as(auth);

      var result = data.update(path, newData, now);

      return {
        pass: result.allowed === false,
        message: targaryen.util.writableError(result)
      };

    }};
  }

};
