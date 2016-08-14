
'use strict';

var root, rules,
  debug = true,
  Ruleset = require('./ruleset'),
  RuleDataSnapshot = require('./rule-data-snapshot');

var userDefinitions = exports.userDefinitions = {

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
  } else if (auth === userDefinitions.password) {
    return 'a user authenticated via Password Login';
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

exports.setFirebaseData = function(data, now) {
  now = now || Date.now();

  try {
    root = new RuleDataSnapshot(RuleDataSnapshot.convert(data, now), now);
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
    throw new Error('Proposed Firebase rules are not valid: ' + e.message);
  }

};

exports.getFirebaseRules = function() {
  return rules;
};

exports.makeNewDataSnap = function() {
  return RuleDataSnapshot.create.apply(null, arguments)
};
