
'use strict';

var root, rules,
  debug = true,
  Ruleset = require('./ruleset'),
  RuleDataSnapshot = require('./rule-data-snapshot');

var userDefinitions = exports.userDefinitions = {

  unauthenticated: null,
  facebook: {
    uid: 'facebook:1',
    id: 1,
    provider: 'facebook'
  },
  twitter: {
    uid: 'twitter:1',
    id: 1,
    provider: 'twitter'
  },
  github: {
    uid: 'github:1',
    id: 1,
    provider: 'github'
  },
  google: {
    uid: 'google:1',
    id: 1,
    provider: 'google'
  },
  anonymous: {
    uid: 'anonymous:1',
    id: 1,
    provider: 'anonymous'
  },
  simplelogin: {
    uid: 'simplelogin:1',
    id: 1,
    provider: 'simplelogin'
  }

};


function getUserDescription(auth) {

  if (auth === null || auth === undefined) {
    return 'an unauthenticated user';
  } else if (auth === userDefinitions.facebook) {
    return 'a user authenticated via Facebook';
  } else if (auth === userDefinitions.twitter) {
    return 'a user authenticated via Twitter';
  } else if (auth === userDefinitions.anonymous) {
    return 'a user authenticated anonymously';
  } else if (auth === userDefinitions.github) {
    return 'a user authenticated via Github';
  } else if (auth === userDefinitions.google) {
    return 'a user authenticated via Google';
  } else if (auth === userDefinitions.simplelogin) {
    return 'a user authenticated via Simple Login';
  } else if (auth.$description) {
    return auth.$description;
  } else {
    return 'a user with credentials ' + JSON.stringify(auth);
  }

}

exports.readableError = function(result) {

  var msg = 'Expected ' + getUserDescription(result.auth) +
    ' not to be able to read ' + result.path +
    ', but the rules allowed the read.';

  if (debug) {
    msg += '\n' + result.info;
  }

  return msg;

};

exports.unreadableError = function(result) {

  var msg = 'Expected ' + getUserDescription(result.auth) +
    ' to be able to read ' + result.path +
    ', but the rules denied the read.';

  if (debug) {
    msg += '\n' + result.info;
  }

  return msg;

};

exports.writableError = function(result) {

  var msg = 'Expected ' + getUserDescription(result.auth) +
    ' not to be able to write ' + JSON.stringify(result.newData) +
    ' to ' + result.path +
    ', but the rules allowed the write.';

  if (debug) {
    msg += '\n' + result.info;
  }

  return msg;

};

exports.unwritableError = function(result) {

  var msg = 'Expected ' + getUserDescription(result.auth) +
    ' to be able to write ' + JSON.stringify(result.newData) +
    ' to ' + result.path +
    ', but the rules denied the write.';

  if (debug) {
    msg += '\n' + result.info;
  }

  return msg;

};

exports.setDebug = function(newDebug) {
  debug = newDebug === true;
};

exports.assertConfigured = function() {

  if (!rules || !root) {
    throw new Error('You must call setFirebaseData and ' +
      'setFirebaseRules before running tests!');
  }

};

exports.setFirebaseData = function(data) {

  try {
    root = new RuleDataSnapshot(RuleDataSnapshot.convert(data));
  } catch(e) {
    throw new Error('Proposed Firebase data is not valid: ' + e.message);
  }

};

exports.getFirebaseData = function() {
  return root;
};

exports.setFirebaseRules = function(ruleDefinition) {

  try {
    rules = new Ruleset(ruleDefinition);
  } catch(e) {

    var err = new Error('Proposed Firebase rules are not valid: ' + e.message);
    throw err;

  }

};

exports.getFirebaseRules = function() {
  return rules;
};
