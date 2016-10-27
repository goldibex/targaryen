
'use strict';

const Ruleset = require('../../../lib/ruleset');
const store = require('../../../lib/store');

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

function getData() {

  return store.create({
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
    let initialData;

    beforeEach(function() {
      initialData = store.create({'a': 1});
    });

    it('should fail on error in validate', function() {
      const rules = new Ruleset({
        rules: {
          '.write': true,
          a: {
            '.validate': 'newData.val().contains("one") === true'
          }
        }
      });
      const result = rules.tryWrite('/a', initialData, 2, {});

      expect(result.allowed).to.be.false;
    });

    it('should treat nonexistent properties of "auth" as null', function(){
      const rules = new Ruleset({rules: {'.write': 'auth.x === null'}});
      const result = rules.tryWrite('/a', initialData, 2, {});

      expect(result.allowed).to.be.true;
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
    const auth = null;
    let rules, initialData;

    before(function() {
      rules = getRuleset();
      initialData = getData();
    });

    it('returns the result of attempting to read the given path with the given DB state', function() {

      expect(rules.tryRead('foo/firstChild/baz', initialData, auth).allowed).to.be.true;
      expect(rules.tryRead('foo/secondChild/baz', initialData, auth).allowed).to.be.false;

    });

    it('should propagate variables in path', function() {

      expect(rules.tryRead('nested/one/two', initialData, auth).allowed).to.be.false;
      expect(rules.tryRead('nested/one/one', initialData, auth).allowed).to.be.true;

    });

  });


  describe('#tryWrite', function() {
    const _now = Date.now;
    const noAuth = null;
    const superAuth = {id: 1};
    let rules, initialData;

    beforeEach(function() {
      let now = 1000;

      Date.now = () => now++;
    });

    afterEach(function() {
      Date.now = _now;
    });

    beforeEach(function() {
      rules = getRuleset();
      initialData = getData();
    });

    it('should match "now" with the server timestamp', function() {

      const newData = {'.sv': 'timestamp'};

      expect(rules.tryWrite('timestamp/foo', initialData, newData, noAuth).allowed).to.be.true;

    });

    it('returns the result of attempting to write the given path with the given DB state and new data', function() {

      const newData = {'wut': {'.value': true}};

      expect(rules.tryWrite('foo/firstChild', initialData, newData, noAuth).allowed).to.be.false;
      expect(rules.tryWrite('foo/firstChild', initialData, newData, superAuth).allowed).to.be.true;

    });

    it('should propagate variables in path', function() {

      expect(rules.tryWrite('nested/one/two', initialData, {id: {'.value': 'two'}}, noAuth).allowed).to.be.false;
      expect(rules.tryWrite('nested/one/one', initialData, {id: {'.value': 'one'}}, noAuth).allowed).to.be.true;
      expect(rules.tryWrite('nested/one/one', initialData, {id: {'.value': 'two'}}, noAuth).allowed).to.be.false;

    });

    it('should prune null keys', function(){

      initialData = store.create({'a': 1, 'b': 2});
      rules = new Ruleset({rules: {'.write': true}});

      expect(
        rules.tryWrite('/a', initialData, null, noAuth).newRoot.val()
      ).to.be.deep.equal(
        {'b': 2}
      );

      expect(
        rules.tryWrite('/', initialData, {'a': 1, 'b': {}}, noAuth).newRoot.val()
      ).to.be.deep.equal(
        {'a': 1}
      );

    });

    it('should prune null keys deeply', function(){

      initialData = store.create({'a': {'b': 2}});
      rules = new Ruleset({rules: {'.write': true}});

      const result = rules.tryWrite('/a/b', initialData, null, noAuth);

      expect(result.newRoot.val()).to.be.deep.equal(null);
      expect(result.newRoot.child('a').val()).to.be.null;
      expect(result.newRoot.child('a').exists()).to.be.false;
      expect(result.newRoot.val()).to.be.null;
      expect(result.newRoot.exists()).to.be.false;

    });

    it('should replace a node, not merge it', function() {
      let result = rules.tryWrite('mixedType/first', initialData, {
        type: {'.value': 'b'},
        b: {'.value': 1}
      }, noAuth);

      expect(result.newData.val()).to.eql({type: 'b', b: 1});
      expect(result.allowed).to.be.true;

      result = rules.tryWrite('mixedType/first', initialData, {
        type: {'.value': 'a'},
        b: {'.value': 1}
      }, noAuth);

      expect(result.allowed).to.be.false;
    });

  });

  describe('#tryPatch', function() {
    const _now = Date.now;
    let rules, initialData, auth;

    beforeEach(function() {
      let now = 1000;

      Date.now = () => now++;
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

      initialData = store.create({
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
      const newData = {
        'timestamps/foo': {'.sv': 'timestamp'},
        'timestamps/bar': {'.sv': 'timestamp'},
        'timestamps/baz': 12345000
      };

      expect(rules.tryPatch('/', initialData, newData, null).allowed).to.be.false;
      delete newData['timestamps/baz'];

      expect(rules.tryPatch('/', initialData, newData, null).allowed).to.be.true;
    });

    it('should allow validate write', function() {
      var newData = {
        'foo/baz': false,
        'foo/fooz': false
      };

      expect(rules.tryPatch('/', initialData, newData, auth).allowed).to.be.true;
      expect(rules.tryPatch('/', initialData, newData, null).allowed).to.be.false;

      newData['foo/bar'] = false;
      expect(rules.tryPatch('/', initialData, newData, auth).allowed).to.be.false;
    });

    it('should propagate variables in path', function() {
      expect(rules.tryPatch('nested/one/one', initialData, {foo: 2}, auth).allowed).to.be.true;
      expect(rules.tryPatch('nested/one/two', initialData, {foo: 2}, auth).allowed).to.be.false;
    });

    it('should handle empty patch', function() {
      const result = rules.tryPatch('nested/one/one', initialData, {}, auth);

      expect(result.allowed).to.be.true;
      expect(result.newData.val()).to.eql({foo: 1});
    });

    it('should prune null keys deeply', function(){

      initialData = store.create({'a': {'b': 2}});
      rules = new Ruleset({rules: {'.write': true}});

      const result = rules.tryPatch('/', initialData, {'/a/b': {}}, null);

      expect(result.newRoot.val()).to.be.deep.equal(null);
      expect(result.newRoot.child('a').val()).to.be.null;
      expect(result.newRoot.child('a').exists()).to.be.false;
      expect(result.newRoot.val()).to.be.null;
      expect(result.newRoot.exists()).to.be.false;

    });

  });

});
