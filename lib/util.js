/**
 * Common operations for test framework.
 */

'use strict';

const ruleset = require('./ruleset');
const store = require('./store');
const database = require('./database');
const pad = require('./pad');

let debug = true;
let verbose = true;
let data, rules, db;

const users = exports.users = {

  unauthenticated: null,
  facebook: {
    uid: 'facebook:f4475868-a864-4bbe-a1e4-78790cd22572',
    id: 1,
    provider: 'facebook'
  },
  twitter: {
    uid: 'twitter:3678364c-e063-4a8e-87f6-b02f0f284f1f',
    id: 1,
    provider: 'twitter'
  },
  github: {
    uid: 'github:766cf16c-b2b9-4dd2-9230-89e3fab0d46b',
    id: 1,
    provider: 'github'
  },
  google: {
    uid: 'google:2bee04bc-1da6-4680-81d6-c10ec9442fe9',
    id: 1,
    provider: 'google'
  },
  anonymous: {
    uid: 'anonymous:f426417a-2268-4319-a4d4-3ef82f3eb1c6',
    id: 1,
    provider: 'anonymous'
  },
  password: {
    uid: 'password:500f6e96-92c6-4f60-ad5d-207253aee4d3',
    id: 1,
    provider: 'password'
  }

};

function getUserDescription(auth) {

  if (auth == null) {
    return 'an unauthenticated user';
  }

  if (auth.$description) {
    return auth.$description;
  }

  switch (auth) {
  case users.facebook:
    return 'a user authenticated via Facebook';
  case users.twitter:
    return 'a user authenticated via Twitter';
  case users.anonymous:
    return 'a user authenticated anonymously';
  case users.github:
    return 'a user authenticated via Github';
  case users.google:
    return 'a user authenticated via Google';
  case users.password:
    return 'a user authenticated via Password Login';
  default:
    return 'a user with credentials ' + JSON.stringify(auth);
  }

}

function debugInfo(msg, result, padding) {
  const info = debug === true ? `${msg}\n${result.info}` : msg;

  return padding == null ? info : pad.lines(info, {length: padding});
}

exports.readableError = function(result, padding) {

  const msg = 'Expected ' + getUserDescription(result.auth) +
    ' not to be able to read ' + result.path +
    ', but the rules allowed the read.';

  return debugInfo(msg, result, padding);

};

exports.unreadableError = function(result, padding) {

  const msg = 'Expected ' + getUserDescription(result.auth) +
    ' to be able to read ' + result.path +
    ', but the rules denied the read.';

  return debugInfo(msg, result, padding);

};

exports.writableError = function(result, padding) {

  const msg = 'Expected ' + getUserDescription(result.auth) +
    ' not to be able to write ' + JSON.stringify(result.newValue) +
    ' to ' + result.path +
    ', but the rules allowed the write.';

  return debugInfo(msg, result, padding);

};

exports.unwritableError = function(result, padding) {

  const msg = 'Expected ' + getUserDescription(result.auth) +
    ' to be able to write ' + JSON.stringify(result.newValue) +
    ' to ' + result.path +
    ', but the rules denied the write.';

  return debugInfo(msg, result, padding);

};

exports.setDebug = function(newDebug) {
  debug = newDebug === true;
  exports.setVerbose(false);
};

exports.setVerbose = function(newVerbose) {
  verbose = newVerbose === true;

  if (verbose === true) {
    debug = true;
  }

  if (db) {
    db = db.with({debug: verbose});
  }
};

exports.assertConfigured = function() {

  if (!rules || !data) {
    throw new Error(
      'You must call setFirebaseData and setFirebaseRules before running tests!'
    );
  }

};

exports.setFirebaseData = function(value, now) {
  now = now || Date.now();

  try {
    value = store.create(value, {now});
  } catch (e) {
    db = data = undefined;
    throw new Error('Proposed Firebase data is not valid: ' + e.message);
  }

  data = {value, now};
  db = undefined;

};

exports.getFirebaseData = function() {
  exports.assertConfigured();

  if (!db) {
    db = database.create(rules, data.value, data.now).with({debug: verbose});
  }

  return db;
};

exports.setFirebaseRules = function(ruleDefinition) {

  try {
    rules = ruleset.create(ruleDefinition);
  } catch (e) {
    throw new Error('Proposed Firebase rules are not valid: ' + e.message);
  }

};

exports.resetFirebase = function() {
  rules = data = db = undefined;
};
