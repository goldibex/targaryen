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

    it('should provide global scope when infering a computed property type', function() {
      expect(
        () => parser.parse('root[$foo]() == null', ['$foo'])
      ).to.throw(/Invalid property access/);
    });

  });

  describe('#evaluate', function() {

    it('returns the correct result of evaluating the rule given the variable scope', function() {

      fixtures.tests.filter(d => d.isValid && !d.failAtRuntime).forEach(function(details) {
        const state = Object.assign({
          query: database.query(details.query),
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

  describe('#debug', function() {

    it('should format literal', function() {
      const rule = parser.parse('true', []);
      const state = {};

      expect(rule.debug(state).detailed).to.equal('true  [=> true]');
    });

    it('should format binary', function() {
      const rule = parser.parse('2 > 1', []);
      const state = {};

      expect(rule.debug(state).detailed).to.equal('2 > 1  [=> true]');
    });

    it('should format string call', function() {
      const rule = parser.parse('"foo".contains("o")', []);
      const state = {};

      expect(rule.debug(state).detailed).to.equal(
        '"foo".contains("o")  [=> true]\n' +
        'using [\n' +
        '  "foo".contains("o") = true\n' +
        ']'
      );
    });

    it('should format snapshot call', function() {
      const rule = parser.parse('root.hasChildren()', []);
      const state = {root: database.snapshot('/', null)};

      expect(rule.debug(state).detailed).to.equal(
        'root.hasChildren()  [=> false]\n' +
        'using [\n' +
        '  root = {"path":"","exists":false}\n' +
        '  root.hasChildren() = false\n' +
        ']'
      );
    });

    it('should format ternary expression 1/2', function() {
      const rule = parser.parse('auth.isAdmin === true ? true : root.child("open").exists()', []);
      const state = {root: database.snapshot('/', null), auth: {isAdmin: true}};

      expect(rule.debug(state).detailed).to.equal(
        'auth.isAdmin === true  [=> true]  ?\n' +
        '  true  [=> true]  :\n' +
        '  root.child("open").exists()  [=> undefined]\n' +
        '  [=> true]\n' +
        'using [\n' +
        '  auth = {"isAdmin":true}\n' +
        '  auth.isAdmin = true\n' +
        ']'
      );
    });

    it('should format ternary expression 2/2', function() {
      const rule = parser.parse('auth.isAdmin === false ? root.child("open").exists() : true', []);
      const state = {root: database.snapshot('/', null), auth: {isAdmin: true}};

      expect(rule.debug(state).detailed).to.equal(
        'auth.isAdmin === false  [=> false]  ?\n' +
        '  root.child("open").exists()  [=> undefined]  :\n' +
        '  true  [=> true]\n' +
        '  [=> true]\n' +
        'using [\n' +
        '  auth = {"isAdmin":true}\n' +
        '  auth.isAdmin = true\n' +
        ']'
      );
    });

    it('should format indentifier', function() {
      const rule = parser.parse('$foo == "bar"', ['$foo']);
      const state = {$foo: 'bar'};

      expect(rule.debug(state).detailed).to.equal(
        '$foo == "bar"  [=> true]\n' +
        'using [\n' +
        '  $foo = "bar"\n' +
        ']'
      );
    });

    it('should format logical expression', function() {
      const rule = parser.parse(
        'root.hasChild("foo") || root.hasChild("bar") || root.hasChild("baz")',
        []
      );
      const state = {root: database.snapshot('/', {bar: true})};

      expect(rule.debug(state).detailed).to.equal(
        '(\n' +
        '  (\n' +
        '    root.hasChild("foo")  [=> false]\n' +
        '    || root.hasChild("bar")  [=> true]\n' +
        '  )  [=> true]\n' +
        '  || root.hasChild("baz")  [=> undefined]\n' +
        ')  [=> true]\n' +
        'using [\n' +
        '  root = {"path":"","exists":true}\n' +
        '  root.hasChild("bar") = true\n' +
        '  root.hasChild("foo") = false\n' +
        ']'
      );
    });

    it('should format unary expressions', function() {
      const rule = parser.parse('!(root.exists())', []);
      const state = {root: database.snapshot('/', null)};

      expect(rule.debug(state).detailed).to.equal(
        '!(root.exists())  [=> true]\n' +
        'using [\n' +
        '  root = {"path":"","exists":false}\n' +
        '  root.exists() = false\n' +
        ']'
      );
    });

    it('should format array expressions', function() {
      const rule = parser.parse('root.hasChildren(["foo",auth.bar])', []);
      const state = {root: database.snapshot('/', null), auth: {bar: 'baz'}};

      expect(rule.debug(state).detailed).to.equal(
        'root.hasChildren(["foo", auth.bar])  [=> false]\n' +
        'using [\n' +
        '  auth = {"bar":"baz"}\n' +
        '  auth.bar = "baz"\n' +
        '  root = {"path":"","exists":false}\n' +
        '  root.hasChildren(["foo",auth.bar]) = false\n' +
        ']'
      );
    });

  });

});
