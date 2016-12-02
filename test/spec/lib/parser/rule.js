/**
 * Test firebase rule parsing and evaluation.
 */

'use strict';

const parser = require('../../../../lib/parser');
const database = require('../../../../lib/database');
const fixtures = require('./fixtures');

describe('Rule', function() {

  describe('constructor', function() {

    it('accepts valid rule expressions', function() {

      fixtures.tests.filter(d => d.isValid).forEach(function(details) {

        expect(function() {
          parser.parse(details.rule, Object.keys(details.wildchildren || {}));
        }, details.rule).not.to.throw();

      });

    });

    it('rejects invalid rule expressions', function() {

      fixtures.tests.filter(d => !d.isValid).forEach(function(details) {

        expect(function() {
          parser.parse(details.rule, Object.keys(details.wildchildren || {}));
        }, details.rule).to.throw();

      });

    });

  });

  describe('#evaluate', function() {

    it('returns the correct result of evaluating the rule given the variable scope', function() {

      fixtures.tests.filter(d => d.isValid && !d.failAtRuntime).forEach(function(details) {
        const state = Object.assign({
          root: database.snapshot('/', details.data || null),
          now: Date.now(),
          auth: fixtures.users[details.user] || null
        }, details.wildchildren);
        const rule = parser.parse(details.rule, Object.keys(details.wildchildren || {}));

        expect(rule.evaluate(state), details.rule).to.equal(details.evaluateTo);
      });

    });

    it('throw on runtime type error', function() {

      fixtures.tests.filter(d => d.isValid && d.failAtRuntime).forEach(function(details) {
        const state = Object.assign({
          root: database.snapshot('/', details.data || null),
          now: Date.now(),
          auth: fixtures.users[details.user] || null
        }, details.wildchildren);
        const rule = parser.parse(details.rule, Object.keys(details.wildchildren || {}));

        expect(() => rule.evaluate(state), details.rule).to.throw();
      });

    });

    describe('with logical expression', function() {

      it('should evaluate each branch lazily', function() {
        const fail = parser.parse('auth.foo > 1 || true', []);
        const pass = parser.parse('true || auth.foo > 1', []);
        const scope = {auth: null};

        expect(() => fail.evaluate(scope)).to.throw();
        expect(() => pass.evaluate(scope)).to.not.throw();
        expect(pass.evaluate(scope)).to.be.true();
      });

    });

  });

});
