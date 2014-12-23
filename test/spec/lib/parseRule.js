
'use strict';

var parseRule = require('../../../lib/parser/parseRule');

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
  'root.child("users").child($here).val().replace("x", $here) === "yyzzy"'
];
var invalidRules = [
  '7',
  '"foo"',
  '$here === "oz" ? 7 : true',
  '$here.isBoolean()',
  'auth.foo.contains(7)',
  'root.child($here).exists() ? auth.foo.contains("bar", "baz") : false',
  '$somewhere === "over the rainbow"',
  'skies === "blue"',
  '"the dreams that you dare to dream" === true'
];

describe('parseRule', function() {

  it('accepts valid rule expressions', function() {

    validRules.forEach(function(rule) {

      expect(function() {
        parseRule(rule, testWildchildren);
      }, rule).not.to.throw();

    });

  });

  it('rejects invalid rule expressions', function() {

    invalidRules.forEach(function(rule) {

      expect(function() {
        parseRule(rule, testWildchildren);
      }, rule).to.throw();

    });

  });

});
