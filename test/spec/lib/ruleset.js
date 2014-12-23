
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
