/**
 * Test firebase rule set structure validation and navigation.
 *
 * How a rule is validated (type inferring, unknown variable, etc...) should be
 * tested in "test/spec/lib/parser/rule.js".
 *
 */

'use strict';

const ruleset = require('../../../../lib/database/ruleset');

const invalidRulesets = {
  'are null': null,
  'are a string': 'wut',
  'are missing': {noTopLevelRules: true},
  'include extra props': {
    rules: {
      '.read': true,
      '.write': true,
      '.validate': true,
      '.indexOn': 'something'
    },
    otherStuff: true
  },
  'includes an invalid index': {
    rules: {
      '.read': true,
      '.indexOn': true
    }
  },
  'include null nodes': {
    rules: {
      foo: null
    }
  },
  'include primitive nodes': {
    rules: {
      foo: 'true'
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
  'set rules to numbers': {
    rules: {
      '.read': 1
    }
  },
  'set index to an object': {
    rules: {
      '.indexOn': {}
    }
  },
  'set index to an array of number': {
    rules: {
      '.indexOn': [1, 2, 3]
    }
  },
  'include unknown variables': {
    rules: {
      '.validate': 'something.val() + 1 === date.val()',
      '.write': 'something.val() / 2 > 0'
    }
  },
  'include rules composed with unknown variables': {
    rules: {
      '.validate': 'auth != null && something.val() + 1 === date.val()',
      '.write': 'auth != null && something.val() / 2 > 0'
    }
  },
  'include duplicated wildchlidren': {
    rules: {
      $uid: {
        foo: {
          $uid: {
            '.write': true
          }
        }
      }
    }
  },
  'include multiple wildchlidren on the same node': {
    rules: {
      foo: {
        $uid: {
          '.write': true
        },
        $foo: {
          '.write': true
        }
      }
    }
  }
};

const validRulesets = {
  'sets an empty rules property': {rules: {}},
  'defines valid read/write/indexOn/validate rules': {
    rules: {
      '.read': true,
      '.write': true,
      '.indexOn': 'wut',
      '.validate': true
    }
  },
  'includes array indexes': {
    rules: {
      '.indexOn': ['wut', 'the', 'heck']
    }
  },
  'uses addition of unknow types': {
    rules: {
      '.validate': 'newData.val() + 1 === data.val()',
      '.write': 'newData.val() / 2 > 0'
    }
  },
  'uses wildchildren': {
    rules: {
      $uid: {
        foo: {
          $other: {
            '.write': true
          }
        }
      }
    }
  }
};

describe('Ruleset', function() {

  describe('constructor', function() {

    Object.keys(invalidRulesets).forEach(function(reason) {
      it(`should rejects when rulesets ${reason}`, function() {
        expect(() => ruleset.create(invalidRulesets[reason])).to.throw();
      });
    });

    Object.keys(validRulesets).forEach(function(reason) {
      it(`accepts accept a rulesets when it ${reason}`, function() {
        expect(() => ruleset.create(validRulesets[reason])).to.not.throw();
      });
    });

    it('should define a tree', function() {
      const set = ruleset.create({
        rules: {
          '.read': true,
          a: {
            '.write': false,
            b: {
              '.validate': true
            }
          }
        }
      });

      expect(set.root.$read.toString()).to.equal('true');
      expect(set.root.a.$write.toString()).to.equal('false');
      expect(set.root.a.b.$validate.toString()).to.equal('true');
    });

    it('should define a tree with wildchildren', function() {
      const set = ruleset.create({
        rules: {
          '.read': true,
          a: {
            '.write': false,
            $b: {
              '.validate': true
            }
          }
        }
      });

      expect(set.root.a.$wildchild.$validate.toString()).to.equal('true');
      expect(set.root.a.$wildchild.$name).to.equal('$b');
      expect(set.root.a.$wildchild.$isWildchild).to.be.true();
    });

  });

  describe('#root', function() {

    describe('#$child', function() {

      it('should return rules for a direct child node', function() {
        const rules = ruleset.create({
          rules: {
            '.read': true,
            a: {
              '.write': false
            },
            $b: {
              '.validate': true
            }
          }
        });

        expect(rules.root.$child('a').rules).to.equal(rules.root.a);
      });

      it('should return rules for a direct wildchild node', function() {
        const rules = ruleset.create({
          rules: {
            '.read': true,
            a: {
              '.write': false
            },
            $b: {
              '.validate': true
            }
          }
        });
        const child = rules.root.$child('foo');

        expect(child.rules).to.equal(rules.root.$wildchild);
        expect(child.wildchildren).to.eql({$b: 'foo'});
      });

      it('should return rules for a deep child node', function() {
        const rules = ruleset.create({
          rules: {
            '.read': true,
            a: {
              $b: {
                $c: {
                  d: {
                    '.read': true
                  }
                }
              }
            }
          }
        });
        const child = rules.root.$child('a/foo/bar/d');

        expect(child.rules).to.equal(rules.root.a.$wildchild.$wildchild.d);
        expect(child.wildchildren).to.eql({$b: 'foo', $c: 'bar'});
      });

      it('should return rules for a direct wildchild node', function() {
        const rules = ruleset.create({
          rules: {
            '.read': true,
            a: {
              '.write': false
            },
            $b: {
              '.validate': true
            }
          }
        });
        const child = rules.root.$child('foo');

        expect(child.rules).to.equal(rules.root.$wildchild);
        expect(child.wildchildren).to.eql({$b: 'foo'});
      });

    });

    describe('#$traverse', function() {

      it('should yield each node on its path', function() {
        const rules = ruleset.create({
          rules: {
            '.read': true,
            a: {
              b: {
                c: {
                  no: {
                    '.read': true
                  }
                }
              },
              no: {
                '.read': true
              }
            },
            no: {
              '.read': true
            }
          }
        });
        const cb = sinon.spy();

        rules.root.$traverse('a/b/c', cb);

        expect(cb).to.have.been.calledWith('', rules.root, {});
        expect(cb).to.have.been.calledWith('a', rules.root.a);
        expect(cb).to.have.been.calledWith('a/b', rules.root.a.b);
        expect(cb).to.have.been.calledWith('a/b/c', rules.root.a.b.c);

        expect(cb).to.have.callCount(4);
      });

      it('should yield wildchild nodes on its path', function() {
        const rules = ruleset.create({
          rules: {
            '.read': true,
            a: {
              $b: {
                $c: {
                  '.read': true
                }
              }
            }
          }
        });
        const cb = sinon.spy();

        rules.root.$traverse('a/foo/bar', cb);

        expect(cb).to.have.been.calledWith('', rules.root, {});
        expect(cb).to.have.been.calledWith('a', rules.root.a, {});
        expect(cb).to.have.been.calledWith('a/foo', rules.root.a.$wildchild, {$b: 'foo'});
        expect(cb).to.have.been.calledWith('a/foo/bar', rules.root.a.$wildchild.$wildchild, {$b: 'foo', $c: 'bar'});

        expect(cb).to.have.callCount(4);
      });

      it('should extend wildchildren list', function() {
        const rules = ruleset.create({
          rules: {
            '.read': true,
            a: {
              $b: {
                $c: {
                  '.read': true
                }
              }
            }
          }
        });
        const cb = sinon.spy();

        rules.root.a.$wildchild.$traverse('bar', {$b: 'foo'}, cb);

        expect(cb).to.have.been.calledWith('', rules.root.a.$wildchild, {$b: 'foo'});
        expect(cb).to.have.been.calledWith('bar', rules.root.a.$wildchild.$wildchild, {$b: 'foo', $c: 'bar'});
        expect(cb).to.have.callCount(2);
      });

      it('should yield each node in descending or', function() {
        const rules = ruleset.create({
          rules: {
            '.read': true,
            a: {
              b: {
                c: {
                  '.read': true
                }
              }
            }
          }
        });
        const cb = sinon.spy();

        rules.root.$traverse('a/b/c', cb);

        expect(cb.getCall(0).args[0]).to.equal('');
        expect(cb.getCall(1).args[0]).to.equal('a');
        expect(cb.getCall(2).args[0]).to.equal('a/b');
        expect(cb.getCall(3).args[0]).to.equal('a/b/c');
      });

      it('should allow traversing to stop', function() {
        const rules = ruleset.create({
          rules: {
            '.read': true,
            a: {
              b: {
                c: {
                  '.read': true
                }
              }
            }
          }
        });
        const cb = sinon.stub();

        cb.returns(false);
        cb.withArgs('a').returns(true);

        rules.root.$traverse('a/b/c', cb);

        expect(cb).to.have.been.calledWith('', rules.root);
        expect(cb).to.have.been.calledWith('a', rules.root.a);

        expect(cb).to.have.callCount(2);
      });

    });

  });

});
