
'use strict';

var root, rules, debug = true;
var userNames = {
  'facebook': 'a Facebook user',
  'twitter': 'a Twitter user',
  'anonymous': 'an anonymous user'
};

function readableError(auth, result) {

  var msg = 'Expected ' + getUserDescription(auth) +
    ' not to be able to read ' + result.path +
    ', but the rules allowed the read.';

  if (debug) {
    msg += '\n' + result.info;
  }

  return msg;

}

function unreadableError(auth, result) {

  var msg = 'Expected ' + getUserDescription(auth) +
    ' to be able to read ' + result.path +
    ', but the rules denied the read.';

  if (debug) {
    msg += '\n' + result.info;
  }

  return msg;

}

function writableError(auth, result, newData) {

  var msg = 'Expected ' + getUserDescription(auth) +
    ' not to be able to write ' + JSON.stringify(newData._getVal()) +
    ' to ' + result.path +
    ', but the rules allowed the write.';

  if (debug) {
    msg += '\n' + result.info;
  }

  return msg;

}

function unwritableError(auth, result, newData) {

  var msg = 'Expected ' + getUserDescription(auth) +
    ' to be able to write ' + JSON.stringify(newData._getVal()) +
    ' to ' + result.path +
    ', but the rules denied the write.';

  if (debug) {
    msg += '\n' + result.info;
  }

  return msg;

}


function getUserDescription(auth) {

  if (auth === null || auth === undefined) {
    return 'an unauthenticated user';
  } else if (userNames[auth.provider]) {
    return userNames[auth.provider];
  } else if (auth.$description) {
    return auth.$description;
  } else {
    return 'a user with credentials ' + JSON.stringify(auth);
  }

}


var Ruleset = require('./ruleset'),
  RuleDataSnapshot = require('./rule-data-snapshot');

var plugin = function chaiTargaryen(chai, utils) {

  chai.Assertion.addProperty('can', function() {
    utils.flag(this, 'positivity', true);
  });

  chai.Assertion.addProperty('cannot', function() {
    utils.flag(this, 'positivity', false);
  });

  chai.Assertion.addProperty('read', function() {
    utils.flag(this, 'operation', 'read');
  });

  chai.Assertion.addChainableMethod('write', function(data) {

    if (typeof data !== 'object' || data === null) {
      data = {
        '.value': data
      };
    }

    utils.flag(this, 'operation', 'write');
    if (data) {
      utils.flag(this, 'operationData', new RuleDataSnapshot(RuleDataSnapshot.convert(data)));
    }

  }, function() {
    utils.flag(this, 'operation', 'write');
  });

  chai.Assertion.addMethod('path', function(path) {

    if (!rules || !root) {
      throw new Error('You must call plugin.setFirebaseData and ' +
        'plugin.setFirebaseRules before running tests.');
    }

    var operationType = utils.flag(this, 'operation'),
      positivity = utils.flag(this, 'positivity'),
      result;

    if (operationType === 'read') {

      result = rules.tryRead(path, root, this._obj);

      if (positivity) {
        chai.assert(result.allowed === true, unreadableError(this._obj, result));
      } else {
        chai.assert(result.allowed === false, readableError(this._obj, result));
      }

    } else if (operationType === 'write') {

      var newData = utils.flag(this, 'operationData');

      result = rules.tryWrite(path, root, newData, this._obj);

      if (positivity) {
        chai.assert(result.allowed === true, unwritableError(this._obj, result, newData));
      } else {
        chai.assert(result.allowed === false, writableError(this._obj, result, newData));
      }

    }

  });

};

plugin.setFirebaseData = function(data) {

  try {
    root = new RuleDataSnapshot(RuleDataSnapshot.convert(data));
  } catch(e) {
    throw new Error('Proposed Firebase data is not valid: ' + e.msg);
  }

};

plugin.setFirebaseRules = function(ruleDefinition) {

  try {
    rules = new Ruleset(ruleDefinition);
  } catch(e) {

    var err = new Error('Proposed Firebase rules are not valid: ' + e.msg);
    err.stack = e.stack;
    throw err;

  }

};

plugin.users = {

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

module.exports = plugin;
