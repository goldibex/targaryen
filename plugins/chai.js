/**
 * targaryen/plugins/chai - Reference implementation of a chai plugin for
 * targaryen.
 *
 */

'use strict';

const targaryen = require('../');

function chaiTargaryen(chai, utils) {

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

    const auth = this._obj;
    const data = targaryen.util.getFirebaseData().as(auth);
    const operationType = utils.flag(this, 'operation');
    const now = utils.flag(this, 'operationTimestamp');
    const positivity = utils.flag(this, 'positivity');
    let result, newData;

    switch (operationType) {

    case 'read':
      result = data.read(path, now);

      if (positivity) {
        chai.assert(result.allowed === true, targaryen.util.unreadableError(result, 6).trim());
      } else {
        chai.assert(result.allowed === false, targaryen.util.readableError(result, 6).trim());
      }

      return;

    case 'write':
      newData = utils.flag(this, 'operationData');
      result = data.write(path, newData, undefined, now);
      break;

    case 'patch':
      newData = utils.flag(this, 'operationData');
      result = data.update(path, newData, now);
      break;

    default:
      return;
    }

    if (positivity) {
      chai.assert(result.allowed === true, targaryen.util.unwritableError(result, 6).trim());
    } else {
      chai.assert(result.allowed === false, targaryen.util.writableError(result, 6).trim());
    }

  });

}

chaiTargaryen.json = require('firebase-json');
chaiTargaryen.users = targaryen.util.users;
chaiTargaryen.setDebug = targaryen.util.setDebug;
chaiTargaryen.setVerbose = targaryen.util.setVerbose;
chaiTargaryen.setFirebaseData = targaryen.util.setFirebaseData;
chaiTargaryen.setFirebaseRules = targaryen.util.setFirebaseRules;

module.exports = chaiTargaryen;
