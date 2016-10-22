
'use strict';

var Ruleset = require('../../../lib/ruleset'),
  RuleDataSnapshot = require('../../../lib/rule-data-snapshot');

function getRuleset() {

  return new Ruleset({
    rules: {
      '.read': false,
      foo: {
        '.read': false,
        '.write': false,
        '$bar': {
          '.read': 'auth !== null',
          '.write': 'auth.id === 1',
          baz: {
            '.read': 'root.child("users").child($bar).exists()'
          }
        }
      },
      nested: {
        $first: {
          $second: {
            '.read': '$first == $second',
            '.write': '$first == $second',
            $key: {
              '.validate': '$key !== "id" || newData.val() == $second'
            }
          }
        }
      },
      mixedType: {
        $item: {
          '.write': true,
          '.validate': 'newData.hasChildren(["type", "a"]) || newData.hasChildren(["type", "b"])',
          type: {
            '.validate': 'newData.val() == "a" || newData.val() == "b"'
          },
          a: {
            '.validate': 'newData.parent().child("type").val() == "a" \n&& newData.parent().child("b").exists() == false'
          },
          b: {
            '.validate': 'newData.parent().child("type").val() == "b" \n&& newData.parent().child("a").exists() == false'
          }
        }
      },
      timestamp: {
        $foo: {
          '.write': true,
          '.validate': 'newData.val() == now'
        }
      }
    }
  });

}

function getRoot() {

  return new RuleDataSnapshot({
    'foo': {
      'firstChild': {
        '.priority': 0,
        baz: {
          '.value': true
        }
      },
      'secondChild': {
        '.priority': 1,
        baz: {
          '.value': false
        }
      }
    },
    'nested': {
      'one': {
        'one': {id: {'.value': 'one'}},
        'two': {id: {'.value': 'two'}}
      }
    },
    'mixedType': {
      'first': {
        type: {'.value': 'a'},
        a: {'.value': 1}
      }
    },
    'users': {
      'firstChild': {
        '.value': true
      }
    }
  });

}

var invalidRulesets = {
  'are null': null,
  'are a string': 'wut',
  'are missing': { noTopLevelRules: true },
  'include extra props': {
    rules: {
      '.read': true,
      '.write': true,
      '.validate': true,
      '.indexOn': 'something'
    },
    otherStuff: true
  },
  'include invalid index': {
    rules: {
      '.read': true,
      '.indexOn': true
    }
  },
  'include unknown props': {
    rules: {
      '.read': true,
      '.woops': true
    }
  },
  'include unknown wildchild': {
    rules: {
      '.read': '$somewhere === true'
    }
  },
  'set index to an object': {
    rules: {
      '.indexOn': {}
    }
  },
  'include unknown variables': {
    rules: {
      ".validate": "something.val() + 1 === date.val()",
      ".write": "something.val() / 2 > 0"
    }
  },
  'include rules composed with unknown variables': {
    rules: {
      ".validate": "auth != null && something.val() + 1 === date.val()",
      ".write": "auth != null && something.val() / 2 > 0"
    }
  }
};

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
    '.indexOn': ['wut', 'the', 'heck']
  }
}, {
  rules: {
  }
}, {
  rules: {
    ".validate": "newData.val() + 1 === data.val()",
    ".write": "newData.val() / 2 > 0"
  }
}];

describe('Ruleset', function() {

  describe('constructor', function() {

    Object.keys(invalidRulesets).forEach(function(reason) {
      it(`rejects when rulesets ${reason}`, function() {
        expect(function() {
          return new Ruleset(invalidRulesets[reason]);
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

  describe('rule evaluation', function(){

    it('should fail on error in validate', function() {
      var root = new RuleDataSnapshot(RuleDataSnapshot.convert({'a': 1})),
          rules = new Ruleset({rules: {".write": "true", "a": {".validate": "newData.val().contains('one') === true"}}}),
          result = rules.tryWrite('/a', root, 2, {});
      expect(result.allowed).to.be.false;
    });

  });

  describe('#get', function() {

    it('gets all the rules along a given node path', function() {

      var rules = getRuleset();

      var readRules = rules.get('foo/bar/baz/quux', 'read');
      expect(readRules.length).to.equal(4);
      expect(readRules[0].path).to.equal('/');
      expect(readRules[1].path).to.equal('/foo');
      expect(readRules[2].path).to.equal('/foo/bar');
      expect(readRules[3].path).to.equal('/foo/bar/baz');

      var writeRules = rules.get('foo/bar/baz/quux', 'write');
      expect(writeRules.length).to.equal(4);
      expect(writeRules[0].path).to.equal('/');
      expect(writeRules[0].rule).to.be.null;
      expect(writeRules[1].path).to.equal('/foo');
      expect(writeRules[2].path).to.equal('/foo/bar');
      expect(writeRules[3].path).to.equal('/foo/bar/baz');
      expect(writeRules[3].rule).to.be.null;

    });
    it('gets all the rules along a given node path even if path starts with "/"', function() {

      var rules = getRuleset();

      var readRules = rules.get('/foo/bar/baz/quux', 'read');
      expect(readRules.length).to.equal(4);
      expect(readRules[0].path).to.equal('/');
      expect(readRules[1].path).to.equal('/foo');
      expect(readRules[2].path).to.equal('/foo/bar');
      expect(readRules[3].path).to.equal('/foo/bar/baz');

      var writeRules = rules.get('/foo/bar/baz/quux', 'write');
      expect(writeRules.length).to.equal(4);
      expect(writeRules[0].path).to.equal('/');
      expect(writeRules[0].rule).to.be.null;
      expect(writeRules[1].path).to.equal('/foo');
      expect(writeRules[2].path).to.equal('/foo/bar');
      expect(writeRules[3].path).to.equal('/foo/bar/baz');
      expect(writeRules[3].rule).to.be.null;

    });
  });

  describe('#tryRead', function() {

    var rules;

    before(function() {
      rules = getRuleset();
    });

    it('returns the result of attempting to read the given path with the given DB state', function() {

      var root = getRoot(),
        auth = null;

      expect(rules.tryRead('foo/firstChild/baz', root, auth).allowed).to.be.true;
      expect(rules.tryRead('foo/secondChild/baz', root, auth).allowed).to.be.false;

    });

    it('should propagate variables in path', function() {

      var root = getRoot(),
        auth = null;

      expect(rules.tryRead('nested/one/two', root, auth).allowed).to.be.false;
      expect(rules.tryRead('nested/one/one', root, auth).allowed).to.be.true;

    });

  });


  describe('#tryWrite', function() {

    var rules, _now;

    before(function() {
      rules = getRuleset();
    });

    beforeEach(function() {
      _now = Date.now;

      var now = 1000;

      Date.now = function() {
        return now++;
      }
    });

    afterEach(function() {
      Date.now = _now;
    });

    it('should match "now" with the server timestamp', function() {

      var root = getRoot(),
        newData = {'.sv': 'timestamp'},
        noAuth = null;

      expect(rules.tryWrite('timestamp/foo', root, newData, noAuth).allowed).to.be.true;

    });

    it('returns the result of attempting to write the given path with the given DB state and new data', function() {

      var root = getRoot(),
        newData = { 'wut': { '.value': true } },
        noAuth = null,
        superAuth = { id: 1 };

      expect(rules.tryWrite('foo/firstChild', root, newData, noAuth).allowed).to.be.false;
      expect(rules.tryWrite('foo/firstChild', root, newData, superAuth).allowed).to.be.true;

    });

    it('should propagate variables in path', function() {

      var root = getRoot(),
        auth = null;

      expect(rules.tryWrite('nested/one/two', root, {id: {'.value': 'two'}}, auth).allowed).to.be.false;
      expect(rules.tryWrite('nested/one/one', root, {id: {'.value': 'one'}}, auth).allowed).to.be.true;
      expect(rules.tryWrite('nested/one/one', root, {id: {'.value': 'two'}}, auth).allowed).to.be.false;
    });

    it('should prune null keys', function(){

      var root = new RuleDataSnapshot(RuleDataSnapshot.convert({'a': 1, 'b': 2})),
        rules = new Ruleset({rules: {'.write': true}});

      expect(rules.tryWrite('/a', root, null, null).newRoot.val()).to.be.deep.equal({'b': 2});
      expect(rules.tryWrite('/', root, {'a': 1, 'b': {}}, null).newRoot.val()).to.be.deep.equal({'a': 1});

    });

    it('should prune null keys deeply', function(){

      var root = new RuleDataSnapshot(RuleDataSnapshot.convert({'a': {'b': 2}})),
          rules = new Ruleset({rules: {'.write': true}}),
          result = rules.tryWrite('/a/b', root, null, null);

      expect(result.newRoot.val()).to.be.deep.equal(null);
      expect(result.newRoot.child('a').val()).to.be.null;
      expect(result.newRoot.child('a').exists()).to.be.false;
      expect(result.newRoot.val()).to.be.null;
      expect(result.newRoot.exists()).to.be.false;

    });

    it('should replace a node, not merge it', function() {
      var root = getRoot(),
        auth = null,
        result;

      result = rules.tryWrite('mixedType/first', root, {
        type: {'.value': 'b'},
        b: {'.value': 1}
      }, auth);
      expect(result.newData.val()).to.eql({type: 'b', b: 1});
      expect(result.allowed).to.be.true;

      result = rules.tryWrite('mixedType/first', root, {
        type: {'.value': 'a'},
        b: {'.value': 1}
      }, auth)
      expect(result.allowed).to.be.false;
    });

  });

  describe('#tryPatch', function() {

    var rules, root, auth, _now;

    beforeEach(function() {
      _now = Date.now;

      var now = 1000;

      Date.now = function() {
        return now++;
      }
    });

    afterEach(function() {
      Date.now = _now;
    });

    beforeEach(function() {
      rules = new Ruleset({
        rules: {
          '.read': false,
          timestamps: {
            $foo: {
              '.write': true,
              '.validate': 'newData.val() == now'
            }
          },
          foo: {
            '.read': 'auth !== null',
            '.write': 'auth.id === 1',
            '.validate': 'newData.hasChildren(["bar", "baz", "fooz"])',
            bar: {
              '.validate': 'data.exists() == false'
            }
          },
          nested: {
            $first: {
              $second: {
                '.write': '$first == $second'
              }
            }
          }
        }
      });
      root = new RuleDataSnapshot({
        foo: {
          bar: {
            '.value': true
          },
          baz: {
            '.value': true
          },
          fooz: {
            '.value': true
          }
        },
        nested: {
          one: {
            one: {
              foo: {
                '.value': 1
              }
            },
            two: {
              foo: {
                '.value': 1
              }
            },
          }
        }
      });
      auth = {id: 1}
    });

    it('should match "now" with the server timestamp', function() {
      var newData = {
        'timestamps/foo': {'.sv': 'timestamp'},
        'timestamps/bar': {'.sv': 'timestamp'},
        'timestamps/baz': 12345000
      };

      expect(rules.tryPatch('/', root, newData, null).allowed).to.be.false;

      delete newData['timestamps/baz'];
      expect(rules.tryPatch('/', root, newData, null).allowed).to.be.true;
    });

    it('should allow validate write', function() {
      var newData = {
        'foo/baz': false,
        'foo/fooz': false
      };

      expect(rules.tryPatch('/', root, newData, auth).allowed).to.be.true
      expect(rules.tryPatch('/', root, newData, null).allowed).to.be.false

      newData['foo/bar'] = false;
      expect(rules.tryPatch('/', root, newData, auth).allowed).to.be.false
    });

    it('should propagate variables in path', function() {
      expect(rules.tryPatch('nested/one/one', root, {foo: 2}, auth).allowed).to.be.true;
      expect(rules.tryPatch('nested/one/two', root, {foo: 2}, auth).allowed).to.be.false;
    });

    it('should handle empty patch', function() {
      const result = rules.tryPatch('nested/one/one', root, {}, auth)

      expect(result.allowed).to.be.true;
      expect(result.newData.val()).to.eql({foo: 1});
    });

    it('should prune null keys deeply', function(){

      var root = new RuleDataSnapshot(RuleDataSnapshot.convert({'a': {'b': 2}})),
          rules = new Ruleset({rules: {'.write': true}}),
          result = rules.tryPatch('/', root, {'/a/b': {}}, null);

      expect(result.newRoot.val()).to.be.deep.equal(null);
      expect(result.newRoot.child('a').val()).to.be.null;
      expect(result.newRoot.child('a').exists()).to.be.false;
      expect(result.newRoot.val()).to.be.null;
      expect(result.newRoot.exists()).to.be.false;

    });

  });

});
