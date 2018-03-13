/**
 * targaryen/plugins/jasmine - Reference implementation of a jasmine plugin for
 * targaryen.
 *
 */

"use strict";

const targaryen = require("../");

exports.setFirebaseData = targaryen.util.setFirebaseData;
exports.setFirebaseRules = targaryen.util.setFirebaseRules;
exports.setDebug = targaryen.util.setDebug;
exports.setVerbose = targaryen.util.setVerbose;
exports.users = targaryen.util.users;
exports.json = require("firebase-json");

exports.matchers = {
  canRead() {
    return {
      compare(auth, path, options) {
        const data = targaryen.util.getFirebaseData().as(auth);

        const result = data.read(path, options);

        return {
          pass: result.allowed === true,
          message: targaryen.util.unreadableError(result)
        };
      }
    };
  },
  cannotRead() {
    return {
      compare(auth, path, options) {
        const data = targaryen.util.getFirebaseData().as(auth);

        const result = data.read(path, options);

        return {
          pass: result.allowed === false,
          message: targaryen.util.readableError(result)
        };
      }
    };
  },
  canWrite() {
    return {
      compare(auth, path, newData, options) {
        const data = targaryen.util.getFirebaseData().as(auth);

        const result =
          typeof options === "number"
            ? data.write(path, newData, undefined, options)
            : data.write(path, newData, options);

        return {
          pass: result.allowed === true,
          message: targaryen.util.unwritableError(result)
        };
      }
    };
  },
  cannotWrite() {
    return {
      compare(auth, path, newData, options) {
        const data = targaryen.util.getFirebaseData().as(auth);

        const result =
          typeof options === "number"
            ? data.write(path, newData, undefined, options)
            : data.write(path, newData, options);

        return {
          pass: result.allowed === false,
          message: targaryen.util.writableError(result)
        };
      }
    };
  },
  canPatch() {
    return {
      compare(auth, path, newData, options) {
        const data = targaryen.util.getFirebaseData().as(auth);

        const result = data.update(path, newData, options);

        return {
          pass: result.allowed === true,
          message: targaryen.util.unwritableError(result)
        };
      }
    };
  },
  cannotPatch() {
    return {
      compare(auth, path, newData, options) {
        const data = targaryen.util.getFirebaseData().as(auth);

        const result = data.update(path, newData, options);

        return {
          pass: result.allowed === false,
          message: targaryen.util.writableError(result)
        };
      }
    };
  }
};
