
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

  chai.Assertion.addChainableMethod('write', function(data) {

    if (typeof data !== 'object' || data === null) {

      if (data === undefined) {
        data = null;
      }

      data = {
        '.value': data
      };
    }

    utils.flag(this, 'operation', 'write');
    utils.flag(this, 'operationData', helpers.makeNewData(data));

  }, function() {
    utils.flag(this, 'operation', 'write');
    utils.flag(this, 'operationData', helpers.makeNewData(null));
  });

  chai.Assertion.addMethod('path', function(path) {

    helpers.assertConfigured();

    var root = helpers.getFirebaseData(),
      rules = helpers.getFirebaseRules(),
      operationType = utils.flag(this, 'operation'),
      positivity = utils.flag(this, 'positivity'),
      result;

    if (operationType === 'read') {

      result = rules.tryRead(path, root, this._obj);

      if (positivity) {
        chai.assert(result.allowed === true, helpers.unreadableError(this._obj, result));
      } else {
        chai.assert(result.allowed === false, helpers.readableError(this._obj, result));
      }

    } else if (operationType === 'write') {

      var newData = utils.flag(this, 'operationData');

      result = rules.tryWrite(path, root, newData, this._obj);

      if (positivity) {
        chai.assert(result.allowed === true, helpers.unwritableError(this._obj, result, newData));
      } else {
        chai.assert(result.allowed === false, helpers.writableError(this._obj, result, newData));
      }

    }

  });

};

plugin.users = helpers.userDefinitions;
plugin.setFirebaseData = helpers.setFirebaseData;
plugin.setFirebaseRules = helpers.setFirebaseRules;

module.exports = plugin;
