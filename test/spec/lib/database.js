/**
 * Test firebase read /write / update operation simulation.
 *
 * It should only test the correct rules are evaluate, with the correct
 * variables and reported correctly.
 *
 * How a rule should be evaluated should be tested in
 * "test/spec/lib/parser/rule.js".
 *
 */

'use strict';

const database = require('../../../lib/database');

function getRuleset() {

  return {
    rules: {
      '.read': false,
      foo: {
        '.read': false,
        '.write': false,
        $bar: {
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

function getDB() {

  const rules = getRuleset();
  const initialData = {
    foo: {
      firstChild: {
        '.priority': 0,
        baz: {
          '.value': true
        }
      },
      secondChild: {
        '.priority': 1,
        baz: {
          '.value': false
        }
      }
    },
    nested: {
      one: {
        one: {id: {'.value': 'one'}},
        two: {id: {'.value': 'two'}}
      }
    },
    mixedType: {
      first: {
        type: {'.value': 'a'},
        a: {'.value': 1}
      }
    },
    users: {
      firstChild: {
        '.value': true
      }
    }
  };

  return database.create(rules, initialData);
}

describe('database', function() {
  const _now = Date.now;

  beforeEach(function() {
    let now = 1000;

    Date.now = () => now++;
  });

  afterEach(function() {
    Date.now = _now;
  });

  it('should set auth to null by default', function() {
    expect(database.create({rules: {}}, null, 1234)).to.have.property('auth', null);
  });

  it('should set the timestamp ', function() {
    expect(database.create({rules: {}}, null, 1234)).to.have.property('timestamp', 1234);
  });

  it('should set the timestamp to now by default', function() {
    expect(database.create({rules: {}}, null)).to.have.property('timestamp', 1000);
  });

  describe('snapshot', function() {
    let root;

    beforeEach(function() {
      root = database.snapshot('/', {
        '.priority': 'hello',
        users: {
          'password:c7ec6752-45b3-404f-a2b9-7df07b78d28e': {
            '.priority': 1,
            name: {'.value': 'Sherlock Holmes'},
            genius: {'.value': true},
            arrests: {'.value': 70}
          },
          'password:500f6e96-92c6-4f60-ad5d-207253aee4d3': {
            '.priority': 2,
            name: {'.value': 'John Watson'}
          },
          'password:3403291b-fdc9-4995-9a54-9656241c835d': {
            '.priority': 0,
            name: {'.value': 'Inspector Lestrade'},
            arrests: {'.value': 35}
          },
          'password:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx': {
            '.priority': 0,
            '.value': null
          }
        }
      });
    });

    describe('create', function() {

      it('should create a new snapshot', function() {
        expect(database.snapshot('foo/bar/baz', 1).val()).to.eql({
          foo: {
            bar: {
              baz: 1
            }
          }
        });
      });

    });

    describe('#val', function() {

      it('gets the value at the specified path', function() {

        expect(root.val()).to.deep.equal({
          users: {
            'password:c7ec6752-45b3-404f-a2b9-7df07b78d28e': {name: 'Sherlock Holmes', genius: true, arrests: 70},
            'password:500f6e96-92c6-4f60-ad5d-207253aee4d3': {name: 'John Watson'},
            'password:3403291b-fdc9-4995-9a54-9656241c835d': {name: 'Inspector Lestrade', arrests: 35}
          }
        });

      });

    });

    describe('#getPriority', function() {

      it('gets the priority at the specified path', function() {
        expect(root.getPriority()).to.equal('hello');
      });

    });

    describe('#child', function() {

      it('gets a new data snapshot for the specified child key', function() {
        expect(
          root
            .child('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3')
            .child('name')
            .val()
        ).to.equal('John Watson');
      });

    });

    describe('#parent', function() {

      it('gets the parent of the snap', function() {

        expect(
          root
            .child('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/name')
            .parent()
            .val()
        ).to.deep.equal({name: 'John Watson'});

      });

      it('returns null if we are at the top', function() {
        expect(root.parent()).to.be.null();
      });

    });

    describe('#exists', function() {

      it('returns true if some data is at that key', function() {
        expect(root.child('users').exists()).to.be.true();
      });

      it('returns false if no data is at that key', function() {
        expect(root.child('nonexistent').exists()).to.be.false();
      });

    });

    describe('#hasChild', function() {

      it('returns true if the path has a child with the given name', function() {
        expect(root.hasChild('users')).to.be.true();
      });

      it('returns false if the path does not have a child with the given name', function() {
        expect(root.hasChild('nonexistent')).to.be.false();
      });

    });

    describe('#hasChildren', function() {

      describe('with no arguments', function() {

        it('returns true if the path has any children at all', function() {
          expect(
            root
              .child('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3')
              .hasChildren()
          ).to.be.true();
        });

        it('returns false if the path has no children', function() {
          expect(
            root
              .child('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/name')
              .hasChildren()
          ).to.be.false();
        });

      });

      describe('with an empty array', function() {

        it('should should throw', function() {
          expect(() => root.hasChildren([])).to.throw();
        });

      });

      describe('with an array of child names', function() {

        it('returns true if the path has all the specified children', function() {

          expect(
            root
              .child('users/password:c7ec6752-45b3-404f-a2b9-7df07b78d28e')
              .hasChildren(['name', 'genius', 'arrests'])
          ).to.be.true();

        });

        it('returns false if the path is missing even one of the specified children', function() {
          expect(
            root
              .child('users/password:3403291b-fdc9-4995-9a54-9656241c835d')
              .hasChildren(['name', 'genius', 'arrests'])
          ).to.be.false();
        });

      });

    });

    describe('#isNumber', function() {

      it('returns true if the value at the path has type number', function() {
        expect(
          root
            .child('users/password:3403291b-fdc9-4995-9a54-9656241c835d/arrests')
            .isNumber()
        ).to.be.true();
      });

      it('returns false if the value at the path does not have type number', function() {
        expect(
          root
            .child('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/arrests')
            .isNumber()
        ).to.be.false();
      });

    });

    describe('#isBoolean', function() {

      it('returns true if the value at the path has type boolean', function() {
        expect(
          root
            .child('users/password:c7ec6752-45b3-404f-a2b9-7df07b78d28e/genius')
            .isBoolean()
        ).to.be.true();
      });

      it('returns false if the value at the path does not have type boolean', function() {
        expect(
          root
            .child('users/password:3403291b-fdc9-4995-9a54-9656241c835d/name')
            .isBoolean()
        ).to.be.false();
      });

    });

    describe('#isString', function() {

      it('returns true if the value at the path has type string', function() {
        expect(
          root
            .child('users/password:3403291b-fdc9-4995-9a54-9656241c835d/name')
            .isString()
        ).to.be.true();
      });

      it('returns false if the value at the path does not have type string', function() {
        expect(
          root
            .child('users/password:3403291b-fdc9-4995-9a54-9656241c835d')
            .isString()
        ).to.be.false();
      });

    });

    describe('toString', function() {

      it('should return the snapshot path', function() {
        expect(
          root
            .child('users/password:3403291b-fdc9-4995-9a54-9656241c835d/name')
            .toString()
        ).to.equal('users/password:3403291b-fdc9-4995-9a54-9656241c835d/name');
      });

    });

  });

  describe('#walk', function() {
    let data;

    beforeEach(function() {
      data = database.create({rules: {}}, {
        a: 1,
        b: {
          c: 2,
          d: {
            e: {
              f: 3
            }
          }
        }
      });
    });

    it('should yield each child nodes as a snapshot', function() {
      const snaps = [];

      data.walk('b', s => {
        snaps.push(s.toString());
      });

      expect(snaps.sort()).to.eql(['b/c', 'b/d', 'b/d/e', 'b/d/e/f']);
    });

    it('should yield nodes in descending order', function() {
      const snaps = [];

      data.walk('b/d', s => {
        snaps.push(s.toString());
      });

      expect(snaps).to.eql(['b/d/e', 'b/d/e/f']);
    });

    it('should stop yield children when the callback return true', function() {
      const snaps = [];

      data.walk('b/d', s => {
        snaps.push(s.toString());

        return true;
      });

      expect(snaps).to.eql(['b/d/e']);
    });

  });

  describe('#read', function() {
    let db;

    before(function() {
      db = getDB();
    });

    it('returns the result of attempting to read the given path with the given DB state', function() {

      expect(db.read('foo/firstChild/baz').allowed).to.be.true();
      expect(db.read('foo/secondChild/baz').allowed).to.be.false();

    });

    it('should propagate variables in path', function() {

      expect(db.read('nested/one/two').allowed).to.be.false();
      expect(db.read('nested/one/one').allowed).to.be.true();

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
      const result = db.with({rules}).read('foo/bar/baz');

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
      const result = db.with({rules}).read('foo/bar/baz');

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
      const result = db.with({rules}).read('foo/bar/baz');

      expect(result.logs.map(r => r.path)).to.eql(['', 'foo/bar/baz']);
    });

    it('should fail on type error in read rules evaluation', function() {
      const rules = {
        rules: {
          a: {
            '.read': 'data.val().contains("one") === true'
          }
        }
      };

      db = database.create(rules, {a: 1});

      expect(db.read('/a').allowed).to.be.false();
    });

  });

  describe('#write', function() {
    const superAuth = {id: 1};
    let db;

    beforeEach(function() {
      db = getDB();
    });

    it('should match "now" with the server timestamp', function() {

      const newData = {'.sv': 'timestamp'};

      expect(db.write('timestamp/foo', newData).allowed).to.be.true();

    });

    it('returns the result of attempting to write the given path with the given DB state and new data', function() {

      const newData = {wut: {'.value': true}};

      expect(db.write('foo/firstChild', newData).allowed).to.be.false();
      expect(db.as(superAuth).write('foo/firstChild', newData).allowed).to.be.true();

    });

    it('should propagate variables in path', function() {

      expect(db.write('nested/one/two', {id: 'two'}).allowed).to.be.false();
      expect(db.write('nested/one/one', {id: 'one'}).allowed).to.be.true();
      expect(db.write('nested/one/one', {id: 'two'}).allowed).to.be.false();

    });

    it('should prune null keys', function() {

      const value = {a: 1, b: 2};
      const rules = {rules: {'.write': true}};

      db = database.create(rules, value);

      expect(db.write('/a', null).newRoot.val()).to.be.deep.equal({b: 2});
      expect(db.write('/', {a: 1, b: {}}).newRoot.val()).to.be.deep.equal({a: 1});

    });

    it('should prune null keys deeply', function() {

      const value = {a: {b: 2}};
      const rules = {rules: {'.write': true}};

      db = database.create(rules, value);

      const result = db.write('/a/b', null);

      expect(result.newRoot.val()).to.be.deep.equal(null);
      expect(result.newRoot.child('a').val()).to.be.null();
      expect(result.newRoot.child('a').exists()).to.be.false();
      expect(result.newRoot.val()).to.be.null();
      expect(result.newRoot.exists()).to.be.false();

    });

    it('should replace a node, not merge it', function() {
      let result = db.write('mixedType/first', {
        type: {'.value': 'b'},
        b: {'.value': 1}
      });

      expect(result.newData.val()).to.eql({type: 'b', b: 1});
      expect(result.allowed).to.be.true();

      result = db.write('mixedType/first', {
        type: {'.value': 'a'},
        b: {'.value': 1}
      });

      expect(result.allowed).to.be.false();
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
                d: {
                  '.write': 'false'
                }
              }
            }
          }
        }
      };

      db = database.create(rules, null);

      const result = db.write('foo/bar/baz', true);

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

      db = database.create(rules, null);

      const result = db.write('foo/bar/baz', true);

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

      db = database.create(rules, null);

      const result = db.write('foo/bar/baz', true);

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

      db = database.create(rules, null);

      const result = db.write('foo/bar/baz', {d: true, e: {f: true}});

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

      db = database.create(rules, null);

      const result = db.write('foo/bar/baz', {d: true, e: {f: true}});

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

      db = database.create(rules, null);

      const result = db.write('foo/bar/baz', {d: true});

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

      db = database.create(rules, null);

      const result = db.write('foo/bar/baz', null);

      expect(result.logs.map(r => r.path)).to.eql(['foo']);
    });

    it('should fail on type error in write rules evaluation', function() {
      const rules = {
        rules: {
          a: {
            '.write': 'newData.val().contains("one") === true'
          }
        }
      };

      db = database.create(rules, {a: 1});

      expect(db.write('/a', 2).allowed).to.be.false();
    });

    it('should fail on error in validate rules evaluation', function() {
      const rules = {
        rules: {
          '.write': true,
          a: {
            '.validate': 'newData.val().contains("one") === true'
          }
        }
      };

      db = database.create(rules, {a: 1});

      expect(db.write('/a', 2).allowed).to.be.false();
    });

  });

  describe('#update', function() {
    const _now = Date.now;
    let db, auth;

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
            }
          }
        }
      };

      db = database.create(rules, initialData);

      auth = {id: 1};
    });

    it('should match "now" with the server timestamp', function() {
      const newData = {
        'timestamps/foo': {'.sv': 'timestamp'},
        'timestamps/bar': {'.sv': 'timestamp'},
        'timestamps/baz': 12345000
      };

      expect(db.update('/', newData).allowed).to.be.false();
      delete newData['timestamps/baz'];

      expect(db.update('/', newData).allowed).to.be.true();
    });

    it('should allow validate write', function() {
      const newData = {
        'foo/baz': false,
        'foo/fooz': false
      };

      expect(db.as(auth).update('/', newData).allowed).to.be.true();
      expect(db.update('/', newData).allowed).to.be.false();

      newData['foo/bar'] = false;
      expect(db.as(auth).update('/', newData).allowed).to.be.false();
    });

    it('should propagate variables in path', function() {
      expect(db.as(auth).update('nested/one/one', {foo: 2}).allowed).to.be.true();
      expect(db.as(auth).update('nested/one/two', {foo: 2}).allowed).to.be.false();
    });

    it('should handle empty patch', function() {
      const result = db.as(auth).update('nested/one/one', {});

      expect(result.allowed).to.be.true();
      expect(result.newData.val()).to.eql({foo: 1});
    });

    it('should prune null keys deeply', function() {

      const value = {a: {b: 2}};
      const rules = {rules: {'.write': true}};

      db = database.create(rules, value);

      const result = db.update('/', {'/a/b': {}});

      expect(result.newRoot.val()).to.be.deep.equal(null);
      expect(result.newRoot.child('a').val()).to.be.null();
      expect(result.newRoot.child('a').exists()).to.be.false();
      expect(result.newRoot.val()).to.be.null();
      expect(result.newRoot.exists()).to.be.false();

    });

    it('should fail on type error in write rules evaluation', function() {
      const rules = {
        rules: {
          a: {
            '.write': 'newData.val().contains("one") === true'
          }
        }
      };

      db = database.create(rules, {a: 1});

      expect(db.update('/', {a: 2}).allowed).to.be.false();
    });

    it('should fail on error in validate rules evaluation', function() {
      const rules = {
        rules: {
          '.write': true,
          a: {
            '.validate': 'newData.val().contains("one") === true'
          }
        }
      };

      db = database.create(rules, {a: 1});

      expect(db.update('/', {a: 2}).allowed).to.be.false();
    });

  });

});
