
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
    return 'a Facebook user';
  } else if (auth === userDefinitions.twitter) {
    return 'a Twitter user';
  } else if (auth === userDefinitions.anonymous) {
    return 'an anonymous user';
  } else if (auth === userDefinitions.facebook) {

  } else if (auth === userDefinitions.facebook) {

  } else if (auth.$description) {
    return auth.$description;
  } else {
    return 'a user with credentials ' + JSON.stringify(auth);
  }

}

exports.readableError = function(auth, result) {

  var msg = 'Expected ' + getUserDescription(auth) +
    ' not to be able to read ' + result.path +
    ', but the rules allowed the read.';

  if (debug) {
    msg += '\n' + result.info;
  }

  return msg;

};

exports.unreadableError = function(auth, result) {

  var msg = 'Expected ' + getUserDescription(auth) +
    ' to be able to read ' + result.path +
    ', but the rules denied the read.';

  if (debug) {
    msg += '\n' + result.info;
  }

  return msg;

};

exports.writableError = function(auth, result, newData) {

  var msg = 'Expected ' + getUserDescription(auth) +
    ' not to be able to write ' + JSON.stringify(newData._getVal()) +
    ' to ' + result.path +
    ', but the rules allowed the write.';

  if (debug) {
    msg += '\n' + result.info;
  }

  return msg;

};

exports.unwritableError = function(auth, result, newData) {

  var msg = 'Expected ' + getUserDescription(auth) +
    ' to be able to write ' + JSON.stringify(newData._getVal()) +
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

    console.log(e.stack);
    var err = new Error('Proposed Firebase rules are not valid: ' + e.message);
    throw err;

  }

};

exports.getFirebaseRules = function() {
  return rules;
};

exports.makeNewData = function(data) {
  return new RuleDataSnapshot(RuleDataSnapshot.convert(data));
};
