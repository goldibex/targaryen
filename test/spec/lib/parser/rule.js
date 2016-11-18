/**
 * Test firebase rule parsing and evaluation.
 */

'use strict';

const Rule = require('../../../../lib/parser/rule');
const database = require('../../../../lib/database');

const testWildchildren = ['$here', '$there'];
const validRules = [
  'true',
  'false',
  'auth !== null',
  'auth.uid !== "eviluser"',
  'auth.id > 5',
  'auth.provider === "facebook"',
  'auth.contains("75")',
  'auth.whuzza.contains("75")',
  'auth.whuz.that.deep.nested.thing.length > 0',
  'auth.isTernary === true ? root.child("x").exists() : true',
  'root.isBoolean()',
  'root.child(auth.tornado.toUpperCase()).val() === null',
  '$here.length > 0',
  'root.hasChildren()',
  'root.hasChildren(["foo", "bar", "baz"])',
  'root.hasChildren([$here])',
  'root.hasChildren([auth.uid])',
  'root.child("users").child(auth.uid).child($here).val().replace("x", $here) === "yyzzy"',
  'root.child("str").val().matches(/foo/)',
  'root.child("users/"+auth.uid).exists()',
  'root.child(auth.x+auth.y).exists()'
];
const invalidRules = [
  'var foo = 8', // invalid syntax (no declarations allowed)
  'root = 5', // invalid syntax (no assignments allowed)
  'auth.uid === "5"; auth.id === 5', // invalid syntax (2 statements)
  '7', // not a boolean expression at top
  '"foo"', // not a boolean expression at top
  '$here === "oz" ? 7 : true', // conditional expression has indeterminate result type
  '$here.isBoolean()', // $here (string) has no method "isBoolean"
  'auth.foo.contains(7)', // contains takes a string, not a number
  'root.child($here).exists() ? auth.foo.contains("bar", "baz") : false', // nested argument error
  '$somewhere === "over the rainbow"', // $somewhere is undefined
  'skies === "blue"', // skies is undefined
  'root.hasChildren("foo", "bar")', // hasChildren takes an array
  'root.hasChildren(["foo", 7])', // hasChildren only takes strings
  'root.child("str").val().matches("/foo/")', // matches only takes a regular expression literal
  'auth.foo.notFound() == false', // auth properties can only be an object or a primitives
  'root.val().notFound == false', // val only returns primitives.
  'root.child("foo") != null', // child returned value is not a primitive.
  'root.val() > true', // comparaison to  number and string only.
  'root.val() < true',
  'root.val() >= true',
  'root.val() <= true'
];

const ruleEvaluationTests = [{
  rule: '$skies == "blue"',
  wildchildren: ['$skies'],
  scope: {$skies: 'blue'},
  result: true
}, {
  rule: '$skies == "green"',
  wildchildren: ['$skies'],
  scope: {$skies: 'orange'},
  result: false
}, {
  rule: '$skies == "red"',
  wildchildren: [],
  scope: {},
  willThrow: true
}, {
  rule: '$skies == "blue" && auth.dreams == true',
  wildchildren: ['$skies'],
  scope: {$skies: 'blue', auth: {dreams: true}},
  result: true
}, {
  rule: 'auth.dreams.length > 1',
  wildchildren: [],
  scope: {auth: {dreams: 'really do'}},
  result: true
}, {
  rule: 'auth.dreams.length > 1 ? false : true',
  wildchildren: [],
  scope: {auth: {dreams: 'really do'}},
  result: false
}, {
  rule: '!(auth.dreams.length > 1)',
  wildchildren: [],
  scope: {auth: {dreams: 'really do'}},
  result: false
}, {
  rule: 'root.val() == "bar"',
  wildchildren: [],
  scope: {root: database.snapshot('/', {'.value': 'bar'})},
  result: true
}, {
  rule: 'root.val().contains("ba")',
  wildchildren: [],
  scope: {root: database.snapshot('/', {'.value': 'bar'})},
  result: true
}, {
  rule: 'root.val().matches(/^ba/)',
  wildchildren: [],
  scope: {root: database.snapshot('/', {'.value': 'bar'})},
  result: true
}, {
  rule: 'root.val().matches(/^wa/)',
  wildchildren: [],
  scope: {root: database.snapshot('/', {'.value': 'bar'})},
  result: false
}, {
  rule: 'root.isNumber()',
  wildchildren: [],
  scope: {root: database.snapshot('/', {'.value': null})},
  result: true,
  skipOnNoValue: true
}, {
  rule: 'root.isString()',
  wildchildren: [],
  scope: {root: database.snapshot('/', {'.value': null})},
  result: false
}, {
  rule: 'auth.foo[$bar] == true',
  wildchildren: ['$bar'],
  scope: {$bar: 'baz', auth: {foo: {baz: true}}},
  result: true
}, {
  rule: 'auth.foo["baz"] == true',
  wildchildren: [],
  scope: {auth: {foo: {baz: true}}},
  result: true
}, {
  rule: 'auth.foo.baz == true',
  wildchildren: [],
  scope: {auth: {foo: {baz: true}}},
  result: true
}, {
  rule: 'auth.foo.baz == null',
  wildchildren: [],
  scope: {auth: {}},
  result: true
}, {
  rule: 'root.child("foo").child(auth.foo).val() != null',
  wildchildren: [],
  scope: {auth: null, root: database.snapshot('/', {foo: {bar: true}})},
  willThrow: true
}, {
  rule: 'root.child("foo").child(auth.foo).val() == null',
  wildchildren: [],
  scope: {auth: null, root: database.snapshot('/', {foo: {bar: true}})},
  willThrow: true
}, {
  rule: 'root.child("foo").child(auth.foo).exists()',
  wildchildren: [],
  scope: {auth: null, root: database.snapshot('/', {foo: {bar: true}})},
  willThrow: true
}, {
  rule: 'root.child("foo").child(auth.foo).exists() == false',
  wildchildren: [],
  scope: {auth: null, root: database.snapshot('/', {foo: {bar: true}})},
  willThrow: true
}, {
  rule: 'root.child("foo").hasChild(auth.foo)',
  wildchildren: [],
  scope: {auth: null, root: database.snapshot('/', {foo: {bar: true}})},
  willThrow: true
}, {
  rule: 'root.child("foo").hasChild(auth.foo) == false',
  wildchildren: [],
  scope: {auth: null, root: database.snapshot('/', {foo: {bar: true}})},
  willThrow: true
}, {
  rule: 'root.child("foo").hasChildren([auth.foo])',
  wildchildren: [],
  scope: {auth: null, root: database.snapshot('/', {foo: {bar: true}})},
  willThrow: true
}, {
  rule: 'root.child("foo").hasChildren([auth.foo]) == false',
  wildchildren: [],
  scope: {auth: null, root: database.snapshot('/', {foo: {bar: true}})},
  willThrow: true
}, {
  rule: '"foo".contains(auth.foo)',
  wildchildren: [],
  scope: {auth: null},
  willThrow: true
}, {
  rule: '"foo1".contains(auth.foo)',
  wildchildren: [],
  scope: {auth: {foo: 1}},
  willThrow: true
}, {
  rule: '"foo".beginsWith(auth.foo)',
  wildchildren: [],
  scope: {auth: null},
  willThrow: true
}, {
  rule: '"1foo".beginsWith(auth.foo)',
  wildchildren: [],
  scope: {auth: {foo: 1}},
  willThrow: true
}, {
  rule: '"foo".endsWith(auth.foo)',
  wildchildren: [],
  scope: {auth: null},
  willThrow: true
}, {
  rule: '"foo1".endsWith(auth.foo)',
  wildchildren: [],
  scope: {auth: {foo: 1}},
  willThrow: true
}, {
  rule: '"foo".replace(auth.foo, "bar") == "foo"',
  wildchildren: [],
  scope: {auth: null},
  willThrow: true
}, {
  rule: '"foo1".replace(auth.foo, "bar") == "foobar"',
  wildchildren: [],
  scope: {auth: {foo: 1}},
  willThrow: true
}, {
  rule: '"foobar".replace("bar", auth.foo) == "foo1"',
  wildchildren: [],
  scope: {auth: {foo: 1}},
  willThrow: true
}, {
  rule: '-auth.foo == -1',
  wildchildren: [],
  scope: {auth: null},
  willThrow: true
}, {
  rule: '-auth.foo == -1',
  wildchildren: [],
  scope: {auth: {foo: 'one'}},
  willThrow: true
}, {
  rule: '!(auth.foo == null)',
  wildchildren: [],
  scope: {auth: null},
  result: false
}, {
  rule: '!(auth.foo == null)',
  wildchildren: [],
  scope: {auth: {foo: 'one'}},
  result: true
}];

describe('Rule', function() {

  describe('constructor', function() {

    it('accepts valid rule expressions', function() {

      validRules.forEach(function(rule) {

        expect(function() {
          new Rule(rule, testWildchildren);
        }, rule).not.to.throw();

      });

    });

    it('rejects invalid rule expressions', function() {

      invalidRules.forEach(function(rule) {

        expect(function() {
          new Rule(rule, testWildchildren);
        }, rule).to.throw();

      });

    });

  });

  describe('#evaluate', function() {

    it('returns the correct result of evaluating the rule given the variable scope', function() {

      ruleEvaluationTests.forEach(function(ruleTest) {

        if (ruleTest.willThrow) {

          expect(function() {
            const rule = new Rule(ruleTest.rule, ruleTest.wildchildren);

            rule.evaluate(ruleTest.scope, ruleTest.skipOnNoValue);
          }, ruleTest.rule).to.throw();

        } else {

          const rule = new Rule(ruleTest.rule, ruleTest.wildchildren);

          expect(rule.evaluate(ruleTest.scope, ruleTest.skipOnNoValue), ruleTest.rule)
          .to.equal(ruleTest.result);

        }

      });

    });

    describe('with arithmetic operator', function() {
      const expectWith = (rule, auth) => expect(() => new Rule(rule, []).evaluate({auth}), rule);

      ['+', '-', '*', '%'].forEach(function(op) {
        const r1 = `(auth.foo ${op} 1) == 1`;
        const r2 = `(auth.foo ${op} 1) != 1`;
        const r3 = `(1 ${op} auth.foo) == 1`;
        const r4 = `(1 ${op} auth.foo) != 1`;

        describe(op, function() {

          it('should throw on null values', function() {
            const auth = null;

            [r1, r2, r3, r4].forEach(r => expectWith(r, auth).to.throw());
          });

          it('should throw on boolean values', function() {
            const auth = {foo: true};

            [r1, r2, r3, r4].forEach(r => expectWith(r, auth).to.throw());
          });

          it.skip('should not throw on number values', function() {
            const auth = {foo: 1};

            [r1, r2, r3, r4].forEach(r => expectWith(r, auth).to.not.throw());
          });

          if (op === '+') {

            it('should not throw on string values', function() {
              const auth = {foo: 'one'};

              [r1, r2, r3, r4].forEach(r => expectWith(r, auth).to.not.throw());
            });

          } else {

            it('should throw on string values', function() {
              const auth = {foo: 'one'};

              [r1, r2, r3, r4].forEach(r => expectWith(r, auth).to.throw());
            });

          }

        });

      });

    });

    describe('with equality operators', function() {

      it('should not throw on null value', function() {
        ['==', '===', '!=', '!=='].forEach(function(op) {
          const r1 = `'foo' ${op} auth.foo`;
          const r2 = `auth.foo ${op} 'foo'`;
          const auth = null;

          [r1, r2].forEach(r => expect(() => new Rule(r, []).evaluate({auth}), r).to.not.throw());
        });
      });

    });

    describe('with equality operators', function() {

      it('should not throw on null value', function() {
        ['==', '===', '!=', '!=='].forEach(function(op) {
          const r1 = `'foo' ${op} auth.foo`;
          const r2 = `auth.foo ${op} 'foo'`;
          const auth = null;

          [r1, r2].forEach(r => expect(() => new Rule(r, []).evaluate({auth}), r).to.not.throw());
        });
      });

      it('should not throw on different value type tests', function() {
        ['==', '===', '!=', '!=='].forEach(function(op) {
          const r1 = `'one' ${op} auth.foo`;
          const r2 = `auth.foo ${op} 'one'`;
          const auth = {foo: 1};

          [r1, r2].forEach(r => expect(() => new Rule(r, []).evaluate({auth}), r).to.not.throw());
        });
      });

    });

    describe('with comparison operators', function() {

      it('should not throw on null value', function() {
        ['>', '>=', '<', '<='].forEach(function(op) {
          const r1 = `auth.bar ${op} auth.foo`;
          const r2 = `auth.foo ${op} auth.bar`;
          const auth = null;

          [r1, r2].forEach(r => expect(() => new Rule(r, []).evaluate({auth}), r).to.not.throw());
        });
      });

      it('should throw on different value type tests', function() {
        ['>', '>=', '<', '<='].forEach(function(op) {
          const r1 = `'one' ${op} auth.foo`;
          const r2 = `auth.foo ${op} 'one'`;
          const auth = {foo: 1};

          [r1, r2].forEach(r => expect(() => new Rule(r, []).evaluate({auth}), r).to.throw());
        });
      });

    });

    describe('with logical expression', function() {

      it('should evaluate each branch lazily', function() {
        const fail = new Rule('auth.foo > 1 || true', []);
        const pass = new Rule('true || auth.foo > 1', []);
        const scope = {auth: null};

        expect(() => fail.evaluate(scope)).to.throw();
        expect(() => pass.evaluate(scope)).to.not.throw();
        expect(pass.evaluate(scope)).to.be.true();
      });

    });

    describe('with logical expression', function() {

      it('should evaluate each branch lazily', function() {
        const fail = new Rule('true ? auth.foo > 1 : true', []);
        const pass = new Rule('true ? true : auth.foo > 1', []);
        const scope = {auth: null};

        expect(() => fail.evaluate(scope)).to.throw();
        expect(() => pass.evaluate(scope)).to.not.throw();
        expect(pass.evaluate(scope)).to.be.true();
      });

    });

  });

});
