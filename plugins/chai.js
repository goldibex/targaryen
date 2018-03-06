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
    const options = Object.assign({}, utils.flag(this, 'operationOptions'), {now});

    utils.flag(this, 'operation', 'read');
    utils.flag(this, 'operationOptions', options);

  }, function() {
    const options = Object.assign({}, utils.flag(this, 'operationOptions'), {now: null});

    utils.flag(this, 'operation', 'read');
    utils.flag(this, 'operationOptions', options);
  });

  chai.Assertion.addChainableMethod('readWith', function(options) {
    utils.flag(this, 'operation', 'read');
    utils.flag(this, 'operationOptions', options);

  }, function() {
    utils.flag(this, 'operation', 'read');
    utils.flag(this, 'operationOptions', {});
  });

  chai.Assertion.addChainableMethod('write', function(data, options) {

    utils.flag(this, 'operation', 'write');
    utils.flag(this, 'operationData', data);
    utils.flag(this, 'operationOptions', typeof options === 'number' ? {now: options} : options);

  }, function() {
    utils.flag(this, 'operation', 'write');
    utils.flag(this, 'operationData', null);
    utils.flag(this, 'operationOptions', {});
  });

  chai.Assertion.addChainableMethod('patch', function(data, options) {

    utils.flag(this, 'operation', 'patch');
    utils.flag(this, 'operationData', data);
    utils.flag(this, 'operationOptions', options);

  }, function() {
    utils.flag(this, 'operation', 'patch');
    utils.flag(this, 'operationData', null);
    utils.flag(this, 'operationOptions', {});
  });

  chai.Assertion.addMethod('path', function(path) {

    targaryen.util.assertConfigured();

    const auth = this._obj;
    const data = targaryen.util.getFirebaseData().as(auth);
    const operationType = utils.flag(this, 'operation');
    const options = utils.flag(this, 'operationOptions');
    const positivity = utils.flag(this, 'positivity');
    let result, newData;

    switch (operationType) {

    case 'read':
      result = data.read(path, options);

      if (positivity) {
        chai.assert(result.allowed === true, targaryen.util.unreadableError(result, 6).trim());
      } else {
        chai.assert(result.allowed === false, targaryen.util.readableError(result, 6).trim());
      }

      return;

    case 'write':
      newData = utils.flag(this, 'operationData');
      result = data.write(path, newData, options);
      break;

    case 'patch':
      newData = utils.flag(this, 'operationData');
      result = data.update(path, newData, options);
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
