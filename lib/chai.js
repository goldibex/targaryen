
'use strict';

var helpers = require('./test-helpers');

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

    helpers.assertConfigured();

    var root = helpers.getFirebaseData(),
      rules = helpers.getFirebaseRules(),
      operationType = utils.flag(this, 'operation'),
      now = utils.flag(this, 'operationTimestamp'),
      positivity = utils.flag(this, 'positivity'),
      result;

    switch(operationType) {
      case 'read':
        result = rules.tryRead(path, root, this._obj, now);

        if (positivity) {
          chai.assert(result.allowed === true, helpers.unreadableError(result));
        } else {
          chai.assert(result.allowed === false, helpers.readableError(result));
        }

        return;

      case 'write':
        var newData = utils.flag(this, 'operationData');

        result = rules.tryWrite(path, root, newData, this._obj, false, false, false, now);

        break;

      case 'patch':
        var newData = utils.flag(this, 'operationData');

        result = rules.tryPatch(path, root, newData, this._obj, false, false, false, now);

        break;

      default:

        return;
    }

    if (positivity) {
      chai.assert(result.allowed === true, helpers.unwritableError(result));
    } else {
      chai.assert(result.allowed === false, helpers.writableError(result));
    }

  });

};

plugin.users = helpers.userDefinitions;
plugin.setFirebaseData = helpers.setFirebaseData;
plugin.setFirebaseRules = helpers.setFirebaseRules;

module.exports = plugin;
