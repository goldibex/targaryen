
'use strict';

var Rule = require('../../../lib/parser/rule');

var testWildchildren = ['$here', '$there'];
var validRules = [
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
  'root.child("users").child($here).val().replace("x", $here) === "yyzzy"'
];
var invalidRules = [
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
  '"the dreams that you dare to dream" === true', // binary expression needs same type on both sides
  'root.hasChildren("foo", "bar")', // hasChildren takes an array
  'root.hasChildren(["foo", 7])' // hasChildren only takes strings
];

describe('parseRule', function() {

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
