'use strict';

const util = require('../../../lib/util');
const results = require('../../../lib/results');

describe('util', function() {

  describe('setFirebaseData', function() {

    it('should throw on invalid data', function() {
      expect(
        () => util.setFirebaseData(new Date())
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

  describe('user description', function() {
    const path = '/';
    let result, data;

    beforeEach(function() {
      util.setFirebaseRules({rules: {}});
      util.setFirebaseData(null);
      data = util.getFirebaseData();
    });

    it('should describe unauthenticated users', function() {
      result = results.read(path, data);
      expect(util.readableError(result)).to.contain('unauthenticated user');
    });

    it('should describe anonymous users', function() {
      result = results.read(path, data.as(util.users.anonymous));
      expect(util.readableError(result)).to.contain('user authenticated anonymously');
    });

    it('should describe password users', function() {
      result = results.read(path, data.as(util.users.password));
      expect(util.readableError(result)).to.contain('user authenticated via Password Login');
    });

    it('should describe auth', function() {
      const auth = {uid: 123};

      result = results.read(path, data.as(auth));
      expect(util.readableError(result)).to.contain(JSON.stringify(auth));
    });

    it('should describe auth with $description', function() {
      const $description = 'some description';

      result = results.read(path, data.as({$description}));
      expect(util.readableError(result)).to.contain($description);
    });

    ['Facebook', 'Twitter', 'Github', 'Google'].forEach(function(provider) {
      const auth = util.users[provider.toLowerCase()];

      it('should describe Facebook users', function() {
        result = results.read(path, data.as(auth));
        expect(util.readableError(result)).to.contain(`user authenticated via ${provider}`);
      });

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
        result = results.read(path, util.getFirebaseData().as({$description}));
      });

      it('should include the path', function() {
        expect(helper(result)).to.contain(path);
      });

      it('should include the user', function() {
        expect(helper(result)).to.contain($description);
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

        result = results.write(path, data, data, value);
      });

      it('should include the path', function() {
        expect(helper(result)).to.contain(path);
      });

      it('should include the user', function() {
        expect(helper(result)).to.contain($description);
      });

      it('should include the value', function() {
        expect(helper(result)).to.contain(value);
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
