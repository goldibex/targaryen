
'use strict';

const util = require('../../../lib/util');
const database = require('../../../lib/database');

describe('util', function() {

  describe('setFirebaseData', function() {

    it('should not throw on invalid data', function() {
      expect(
        () => util.setFirebaseData(new Date())
      ).to.not.throw();
    });

    it('should throw on invalid data', function() {
      expect(
        () => util.setFirebaseData(/regex/)
      ).to.throw();
    });

  });

  describe('setFirebaseRules', function() {

    it('should throw on invalid rules', function() {
      expect(
        () => util.setFirebaseRules({})
      ).to.throw();
    });

  });

  describe('resetFirebase', function() {

    beforeEach(function() {
      util.setFirebaseRules({rules: {}});
      util.setFirebaseData(null);
    });

    it('should reset rules and data', function() {
      expect(util.getFirebaseData).to.not.throw();

      util.resetFirebase();
      expect(util.getFirebaseData).to.throw();
    });

  });

  ['readableError', 'unreadableError'].forEach(function(name) {
    const helper = util[name];

    describe(name, function() {
      const $description = 'some user description';
      const path = '/some/path';
      let result;

      beforeEach(function() {
        util.setFirebaseRules({rules: {}});
        util.setFirebaseData(null);
        result = database.results.read(path, util.getFirebaseData().as({$description}));
      });

      it('should include result info if debug is enabled', function() {
        util.setDebug(true);
        expect(helper(result)).to.contain(result.info);
      });

      it('should not include result info if debug is disabled', function() {
        util.setDebug(false);
        expect(helper(result)).to.not.contain(result.info);
      });

    });

  });

  ['writableError', 'unwritableError'].forEach(function(name) {
    const helper = util[name];

    describe(name, function() {
      const $description = 'some user description';
      const path = '/some/path';
      const value = 'some value';
      let result;

      beforeEach(function() {
        util.setFirebaseRules({rules: {}});
        util.setFirebaseData(null);

        const data = util.getFirebaseData().as({$description});

        result = database.results.write(path, data, data, value);
      });

      it('should include result info if debug is enabled', function() {
        util.setDebug(true);
        expect(helper(result)).to.contain(result.info);
      });

      it('should not include result info if debug is disabled', function() {
        util.setDebug(false);
        expect(helper(result)).to.not.contain(result.info);
      });

    });

  });

});
