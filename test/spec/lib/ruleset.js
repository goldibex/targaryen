
'use strict';

const ruleset = require('../../../lib/ruleset');
const database = require('../../../lib/database');

function getRuleset() {

  return {
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
              '.validate': 'newData.val() == $second'
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
  };

}

function getData() {

  const rules = getRuleset();
  const initialData = {
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
  };

  return database.create(rules, initialData);
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
  'include null nodes': {
    rules: {
      'foo': null
    }
  },
  'include primitive nodes': {
    rules: {
      'foo': 'true'
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
      '.indexOn': [1,2,3]
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

var validRulesets = {
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
      expect(set.root.a.$wildchild.$isWildchild).to.be.true;
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

  describe('rule evaluation', function(){
    let initialData;

    beforeEach(function() {
      initialData = {'a': 1};
    });

    it('should fail on error in validate', function() {
      const rules = {
        rules: {
          '.write': true,
          a: {
            '.validate': 'newData.val().contains("one") === true'
          }
        }
      };
      const data = database.create(rules, initialData);
      const result = data.write('/a', 2);

      expect(result.allowed).to.be.false;
    });

    it('should treat nonexistent properties of "auth" as null', function(){
      const rules = {rules: {'.write': 'auth.x === null'}};
      const data = database.create(rules, initialData);
      const result = data.write('/a', initialData, 2, {});

      expect(result.allowed).to.be.true;
    });

  });

  describe('#tryRead', function() {
    let data;

    before(function() {
      data = getData();
    });

    it('returns the result of attempting to read the given path with the given DB state', function() {

      expect(data.read('foo/firstChild/baz').allowed).to.be.true;
      expect(data.read('foo/secondChild/baz').allowed).to.be.false;

    });

    it('should propagate variables in path', function() {

      expect(data.read('nested/one/two').allowed).to.be.false;
      expect(data.read('nested/one/one').allowed).to.be.true;

    });

    it('should traverse all read rules', function() {
      const rules = {
        rules: {
          '.read': 'false',
          $a: {
            '.read': 'false',
            $b: {
              '.read': 'false',
              $c: {
                '.read': 'false'
              }
            }
          }
        }
      };
      const result = data.with({rules}).read('foo/bar/baz');

      expect(result.logs.map(r => r.path)).to.eql([
        '',
        'foo',
        'foo/bar',
        'foo/bar/baz'
      ]);
    });

    it('should traverse all read rules', function() {
      const rules = {
        rules: {
          '.read': 'false',
          $a: {
            '.read': 'true',
            $b: {
              '.read': 'true',
              $c: {
                '.read': 'true'
              }
            }
          }
        }
      };
      const result = data.with({rules}).read('foo/bar/baz');

      expect(result.logs.map(r => r.path)).to.eql(['', 'foo']);
    });

    it('should only evaluate read rules', function() {
      const rules = {
        rules: {
          '.read': 'false',
          $a: {
            '.write': 'true',
            $b: {
              '.write': 'true',
              $c: {
                '.read': 'true'
              }
            }
          }
        }
      };
      const result = data.with({rules}).read('foo/bar/baz');

      expect(result.logs.map(r => r.path)).to.eql(['', 'foo/bar/baz']);
    });

  });


  describe('#tryWrite', function() {
    const _now = Date.now;
    const superAuth = {id: 1};
    let data;

    beforeEach(function() {
      let now = 1000;

      Date.now = () => now++;
    });

    afterEach(function() {
      Date.now = _now;
    });

    beforeEach(function() {
      data = getData();
    });

    it('should match "now" with the server timestamp', function() {

      const newData = {'.sv': 'timestamp'};

      expect(data.write('timestamp/foo', newData).allowed).to.be.true;

    });

    it('returns the result of attempting to write the given path with the given DB state and new data', function() {

      const newData = {'wut': {'.value': true}};

      expect(data.write('foo/firstChild', newData).allowed).to.be.false;
      expect(data.as(superAuth).write('foo/firstChild', newData).allowed).to.be.true;

    });

    it('should propagate variables in path', function() {

      expect(data.write('nested/one/two', {id: 'two'}).allowed).to.be.false;
      expect(data.write('nested/one/one', {id: 'one'}).allowed).to.be.true;
      expect(data.write('nested/one/one', {id: 'two'}).allowed).to.be.false;

    });

    it('should prune null keys', function(){

      const value = {'a': 1, 'b': 2};
      const rules = {rules: {'.write': true}};

      data = database.create(rules, value);

      expect(data.write('/a', null).newRoot.val()).to.be.deep.equal({'b': 2});
      expect(data.write('/', {'a': 1, 'b': {}}).newRoot.val()).to.be.deep.equal({'a': 1});

    });

    it('should prune null keys deeply', function(){

      const value = {'a': {'b': 2}};
      const rules = {rules: {'.write': true}};

      data = database.create(rules, value);

      const result = data.write('/a/b', null);

      expect(result.newRoot.val()).to.be.deep.equal(null);
      expect(result.newRoot.child('a').val()).to.be.null;
      expect(result.newRoot.child('a').exists()).to.be.false;
      expect(result.newRoot.val()).to.be.null;
      expect(result.newRoot.exists()).to.be.false;

    });

    it('should replace a node, not merge it', function() {
      let result = data.write('mixedType/first', {
        type: {'.value': 'b'},
        b: {'.value': 1}
      });

      expect(result.newData.val()).to.eql({type: 'b', b: 1});
      expect(result.allowed).to.be.true;

      result = data.write('mixedType/first', {
        type: {'.value': 'a'},
        b: {'.value': 1}
      });

      expect(result.allowed).to.be.false;
    });

    it('should traverse all write rules', function() {
      const rules = {
        rules: {
          '.write': 'false',
          $a: {
            '.write': 'false',
            $b: {
              '.write': 'false',
              $c: {
                '.write': 'false',
                'd': {
                  '.write': 'false'
                }
              }
            }
          }
        }
      };

      data = database.create(rules, null);

      let result = data.write('foo/bar/baz', true);

      expect(result.logs.map(r => r.path)).to.eql([
        '',
        'foo',
        'foo/bar',
        'foo/bar/baz'
      ]);
    });

    it('should traverse write rules until write is permitted', function() {
      const rules = {
        rules: {
          '.write': 'false',
          $a: {
            '.write': 'true',
            $b: {
              '.write': 'true'
            }
          }
        }
      };

      data = database.create(rules, null);

      let result = data.write('foo/bar/baz', true);

      expect(result.logs.map(r => r.path)).to.eql(['', 'foo']);
    });

    it('should only traverse node with write rules', function() {
      const rules = {
        rules: {
          '.write': 'false',
          $a: {
            '.read': 'false',
            $b: {
              '.read': 'true',
              $c: {
                '.write': 'true'
              }
            }
          }
        }
      };

      data = database.create(rules, null);

      let result = data.write('foo/bar/baz', true);

      expect(result.logs.map(r => r.path)).to.eql(['', 'foo/bar/baz']);
    });

    it('should traverse/walk all validate rules', function() {
      const rules = {
        rules: {
          '.validate': 'true',
          '.write': 'true',
          $a: {
            '.validate': 'true',
            $b: {
              '.validate': 'true',
              $c: {
                '.validate': 'true',
                d: {
                  '.validate': 'true'
                },
                e: {
                  '.validate': 'false',
                  f: {
                    '.validate': 'true'
                  }
                }
              }
            }
          }
        }
      };

      data = database.create(rules, null);

      let result = data.write('foo/bar/baz', {d: true, e: {f: true}});

      expect(result.logs.filter(r => r.kind === 'validate').map(r => r.path)).to.eql([
        '',
        'foo',
        'foo/bar',
        'foo/bar/baz',
        'foo/bar/baz/d',
        'foo/bar/baz/e',
        'foo/bar/baz/e/f'
      ]);
    });

    it('should only traverse/walk node with validate rules', function() {
      const rules = {
        rules: {
          $a: {
            '.read': 'false',
            $b: {
              '.read': 'false',
              $c: {
                '.read': 'false',
                d: {
                  '.validate': 'false'
                },
                e: {
                  '.read': 'false',
                  f: {
                    '.validate': 'false'
                  }
                }
              }
            }
          }
        }
      };

      data = database.create(rules, null);

      let result = data.write('foo/bar/baz', {d: true, e: {f: true}});

      expect(result.logs.filter(r => r.kind === 'validate').map(r => r.path)).to.eql([
        'foo/bar/baz/d',
        'foo/bar/baz/e/f'
      ]);
    });

    it('should only traverse/walk node with existing value to write', function() {
      const rules = {
        rules: {
          $a: {
            $b: {
              $c: {
                d: {
                  '.validate': 'false'
                },
                e: {
                  '.validate': 'false',
                  f: {
                    '.validate': 'false'
                  }
                }
              }
            }
          }
        }
      };

      data = database.create(rules, null);

      let result = data.write('foo/bar/baz', {d: true});

      expect(result.logs.filter(r => r.kind === 'validate').map(r => r.path)).to.eql(['foo/bar/baz/d']);
    });

    it('should stop traverse/walk when write is permitted and there is no data to validate', function() {
      const rules = {
        rules: {
          $a: {
            '.write': 'true',
            $b: {
              '.write': 'true',
              $c: {
                '.validate': 'false'
              }
            }
          }
        }
      };

      data = database.create(rules, null);

      let result = data.write('foo/bar/baz', null);

      expect(result.logs.map(r => r.path)).to.eql(['foo']);
    });

  });

  describe('#tryPatch', function() {
    const _now = Date.now;
    let data, auth;

    beforeEach(function() {
      let now = 1000;

      Date.now = () => now++;
    });

    afterEach(function() {
      Date.now = _now;
    });

    beforeEach(function() {
      const rules = {
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
      };

      const initialData = {
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
      };

      data = database.create(rules, initialData);

      auth = {id: 1};
    });

    it('should match "now" with the server timestamp', function() {
      const newData = {
        'timestamps/foo': {'.sv': 'timestamp'},
        'timestamps/bar': {'.sv': 'timestamp'},
        'timestamps/baz': 12345000
      };

      expect(data.update('/', newData).allowed).to.be.false;
      delete newData['timestamps/baz'];

      expect(data.update('/', newData).allowed).to.be.true;
    });

    it('should allow validate write', function() {
      var newData = {
        'foo/baz': false,
        'foo/fooz': false
      };

      expect(data.as(auth).update('/', newData).allowed).to.be.true;
      expect(data.update('/', newData).allowed).to.be.false;

      newData['foo/bar'] = false;
      expect(data.as(auth).update('/', newData).allowed).to.be.false;
    });

    it('should propagate variables in path', function() {
      expect(data.as(auth).update('nested/one/one', {foo: 2}).allowed).to.be.true;
      expect(data.as(auth).update('nested/one/two', {foo: 2}).allowed).to.be.false;
    });

    it('should handle empty patch', function() {
      const result = data.as(auth).update('nested/one/one', {});

      expect(result.allowed).to.be.true;
      expect(result.newData.val()).to.eql({foo: 1});
    });

    it('should prune null keys deeply', function(){

      const value = {'a': {'b': 2}};
      const rules = {rules: {'.write': true}};

      data = database.create(rules, value);

      const result = data.update('/', {'/a/b': {}});

      expect(result.newRoot.val()).to.be.deep.equal(null);
      expect(result.newRoot.child('a').val()).to.be.null;
      expect(result.newRoot.child('a').exists()).to.be.false;
      expect(result.newRoot.val()).to.be.null;
      expect(result.newRoot.exists()).to.be.false;

    });

  });

});
