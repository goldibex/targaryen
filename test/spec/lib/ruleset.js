
'use strict';

var Ruleset = require('../../../lib/ruleset');

var invalidRulesets = [
  null,
  'wut',
  { noTopLevelRules: true },
  {
    rules: {
      '.read': true,
      '.write': true,
      '.validate': true,
      '.indexOn': 'something'
    },
    otherStuff: true
  },
  {
    rules: {
      '.read': true,
      '.indexOn': true
    }
  },
  {
    rules: {
      '.read': true,
      '.woops': true
    }
  },
  {
    rules: {
      '.read': '$somewhere === true'
    }
  },
  {
    rules: {
      '.indexOn': {}
    }
  }
];

var validRulesets = [{
  rules: {}
}, {
  rules: {
    '.read': true,
    '.write': true,
    '.indexOn': 'wut',
    '.validate': true
  }
}, {
  rules: {
  }
}];

describe('Ruleset', function() {

  describe('constructor', function() {

    it('rejects invalid rulesets', function() {

      invalidRulesets.forEach(function(rules) {
        expect(function() {
          return new Ruleset(rules);
        }).to.throw();
      });

    });

    it('accepts valid rulesets', function() {

      validRulesets.forEach(function(rules) {
        expect(function() {
          return new Ruleset(rules);
        }).not.to.throw();
      });

    });

  });

  describe('#get', function() {

    it('gets all the rules along a given node path', function() {

      var rules = new Ruleset({
        rules: {
          '.read': true,
          foo: {
            '.read': true,
            '.write': false,
            '$bar': {
              '.read': 'auth !== null',
              '.write': 'auth.id === 1',
              baz: {
                '.read': 'root.child("users").child($bar).exists()'
              }
            }
          }
        }
      });


      var readRules = rules.get('foo/bar/baz/quux', 'read');
      expect(readRules.length).to.equal(4);
      expect(readRules[0].path).to.equal('');
      expect(readRules[1].path).to.equal('foo');
      expect(readRules[2].path).to.equal('foo/bar');
      expect(readRules[3].path).to.equal('foo/bar/baz');

      var writeRules = rules.get('foo/bar/baz/quux', 'write');
      expect(writeRules.length).to.equal(2);
      expect(readRules[1].path).to.equal('foo');
      expect(readRules[2].path).to.equal('foo/bar');

    });

  });

});
