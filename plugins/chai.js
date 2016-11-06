/**
 * targaryen/plugins/chai - Reference implementation of a chai plugin for
 * targaryen.
 *
 */
'use strict';

var targaryen = require('../');

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

  chai.Assertion.addChainableMethod('readAt', function(now) {

    utils.flag(this, 'operation', 'read');
    utils.flag(this, 'operationTimestamp', now);

  }, function() {
    utils.flag(this, 'operation', 'read');
    utils.flag(this, 'operationTimestamp', null);
  });

  chai.Assertion.addChainableMethod('write', function(data, now) {

    utils.flag(this, 'operation', 'write');
    utils.flag(this, 'operationData', data);
    utils.flag(this, 'operationTimestamp', now);

  }, function() {
    utils.flag(this, 'operation', 'write');
    utils.flag(this, 'operationData', null);
    utils.flag(this, 'operationTimestamp', null);
  });

  chai.Assertion.addChainableMethod('patch', function(data, now) {

    utils.flag(this, 'operation', 'patch');
    utils.flag(this, 'operationData', data);
    utils.flag(this, 'operationTimestamp', now);

  }, function() {
    utils.flag(this, 'operation', 'patch');
    utils.flag(this, 'operationData', null);
    utils.flag(this, 'operationTimestamp', null);
  });

  chai.Assertion.addMethod('path', function(path) {

    targaryen.util.assertConfigured();

    var auth = this._obj,
      data = targaryen.util.getFirebaseData().as(auth),
      operationType = utils.flag(this, 'operation'),
      now = utils.flag(this, 'operationTimestamp'),
      positivity = utils.flag(this, 'positivity'),
      result, newData;

    switch(operationType) {

    case 'read':
      result = data.read(path, now);

      if (positivity) {
        chai.assert(result.allowed === true, targaryen.util.unreadableError(result));
      } else {
        chai.assert(result.allowed === false, targaryen.util.readableError(result));
      }

      return;

    case 'write':
      newData = utils.flag(this, 'operationData');
      result = data.write(path, newData, now);
      break;

    case 'patch':
      newData = utils.flag(this, 'operationData');
      result = data.update(path, newData, now);
      break;

    default:
      return;
    }

    if (positivity) {
      chai.assert(result.allowed === true, targaryen.util.unwritableError(result));
    } else {
      chai.assert(result.allowed === false, targaryen.util.writableError(result));
    }

  });

};

plugin.users = targaryen.util.users;
plugin.setDebug = targaryen.util.setDebug;
plugin.setFirebaseData = targaryen.util.setFirebaseData;
plugin.setFirebaseRules = targaryen.util.setFirebaseRules;

module.exports = plugin;
