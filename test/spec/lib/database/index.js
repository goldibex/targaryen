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

const database = require('../../../../lib/database');

const TS = Object.freeze({'.sv': 'timestamp'});

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
    let rules;

    beforeEach(function() {
      rules = {rules: {}};
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
        const data = {
          foo: {
            bar: 1,
            baz: 2
          },
          qux: 3
        };
        const db = database.create(rules, data);

        expect(db.snapshot('/').val()).to.deep.equal(data);
        expect(db.snapshot('/foo').val()).to.deep.equal(data.foo);
        expect(db.snapshot('/foo/bar').val()).to.deep.equal(data.foo.bar);
        expect(db.snapshot('/foo/baz').val()).to.deep.equal(data.foo.baz);
        expect(db.snapshot('/qux').val()).to.deep.equal(data.qux);
      });

    });

    describe('#getPriority', function() {

      it('gets the priority at the specified path', function() {
        const data = {
          '.priority': 1,
          foo: {
            bar: {
              '.priority': 10,
              '.value': 1
            },
            baz: 2
          }
        };
        const db = database.create(rules, data);

        expect(db.snapshot('/').getPriority()).to.equal(1);
        expect(db.snapshot('/foo/bar').getPriority()).to.equal(10);
        expect(db.snapshot('/foo/baz').getPriority()).to.be.null();
      });

    });

    describe('#child', function() {

      it('gets a new data snapshot for the specified child key', function() {
        const data = {
          foo: {
            bar: 1,
            baz: 2
          },
          qux: 3
        };
        const snap = database.create(rules, data).snapshot('/');

        expect(snap.child('foo').val()).to.deep.equal(data.foo);
      });

    });

    describe('#parent', function() {

      it('gets the parent of the snap', function() {
        const foo = {
          bar: 1,
          baz: 2
        };
        const snap = database.create(rules, {foo}).snapshot('/foo');

        expect(snap.parent().val()).to.deep.equal({foo});
      });

      it('fail if the snapshot was refering to the data root ', function() {
        const data = null;
        const snap = database.create(rules, data).snapshot('/');

        expect(() => snap.parent()).to.throw();
      });

    });

    describe('#exists', function() {

      it('returns true if some data is at that key', function() {
        const data = {foo: 1};
        const snap = database.create(rules, data).snapshot('/');

        expect(snap.exists()).to.be.true();
        expect(snap.child('foo').exists()).to.be.true();
      });

      it('returns true if some data is at that key', function() {
        const data = null;
        const snap = database.create(rules, data).snapshot('/');

        expect(snap.exists()).to.be.false();
        expect(snap.child('foo').exists()).to.be.false();
      });

    });

    describe('#hasChild', function() {

      it('returns true if the path has a child with the given name', function() {
        const data = {foo: 1};
        const snap = database.create(rules, data).snapshot('/');

        expect(snap.hasChild('foo')).to.be.true();
      });

      it('returns false if the path does not have a child with the given name', function() {
        const data = {foo: 1};
        const snap = database.create(rules, data).snapshot('/');

        expect(snap.hasChild('bar')).to.be.false();
      });

    });

    describe('#hasChildren', function() {

      describe('with no arguments', function() {

        it('returns true if the path has any children at all', function() {
          const data = {foo: 1};
          const snap = database.create(rules, data).snapshot('/');

          expect(snap.hasChildren()).to.be.true();
        });

        it('returns false if the path has no children', function() {
          const data = null;
          const snap = database.create(rules, data).snapshot('/');

          expect(snap.hasChildren()).to.be.false();
        });

      });

      describe('with an empty array', function() {

        it('should should throw', function() {
          const data = {foo: 1};
          const snap = database.create(rules, data).snapshot('/');

          expect(() => snap.hasChildren([])).to.throw();
        });

      });

      describe('with an array of child names', function() {

        it('returns true if the path has all the specified children', function() {
          const data = {foo: 1, bar: 2};
          const snap = database.create(rules, data).snapshot('/');

          expect(snap.hasChildren(['foo', 'bar'])).to.be.true();
        });

        it('returns false if the path is missing even one of the specified children', function() {
          const data = {foo: 1};
          const snap = database.create(rules, data).snapshot('/');

          expect(snap.hasChildren(['foo', 'bar'])).to.be.false();
        });

      });

    });

    describe('#isNumber', function() {

      it('returns true if the value at the path has type number', function() {
        const data = 1;
        const snap = database.create(rules, data).snapshot('/');

        expect(snap.isNumber()).to.be.true();
      });

      it('returns false if the value at the path does not have type number', function() {
        const data = {foo: 'bar', bar: false};
        const db = database.create(rules, data);

        expect(db.snapshot('/').isNumber()).to.be.false();
        expect(db.snapshot('/foo').isNumber()).to.be.false();
        expect(db.snapshot('/bar').isNumber()).to.be.false();
      });

    });

    describe('#isBoolean', function() {

      it('returns true if the value at the path has type boolean', function() {
        const data = false;
        const snap = database.create(rules, data).snapshot('/');

        expect(snap.isBoolean()).to.be.true();
      });

      it('returns false if the value at the path does not have type boolean', function() {
        const data = {foo: 'bar', bar: 1};
        const db = database.create(rules, data);

        expect(db.snapshot('/').isBoolean()).to.be.false();
        expect(db.snapshot('/foo').isBoolean()).to.be.false();
        expect(db.snapshot('/bar').isBoolean()).to.be.false();
      });

    });

    describe('#isString', function() {

      it('returns true if the value at the path has type string', function() {
        const data = 'foo';
        const snap = database.create(rules, data).snapshot('/');

        expect(snap.isString()).to.be.true();
      });

      it('returns false if the value at the path does not have type string', function() {
        const data = {foo: 1, bar: true};
        const db = database.create(rules, data);

        expect(db.snapshot('/').isString()).to.be.false();
        expect(db.snapshot('/foo').isString()).to.be.false();
        expect(db.snapshot('/bar').isString()).to.be.false();
      });

    });

    describe('toString', function() {

      it('should return the snapshot path', function() {
        const data = null;
        const db = database.create(rules, data);

        expect(db.snapshot('/').toString()).to.equal('');
        expect(db.snapshot('/foo').toString()).to.equal('foo');
        expect(db.snapshot('/foo/bar').toString()).to.equal('foo/bar');
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

    it('returns the result of attempting to read', function() {
      const rules = {
        rules: {
          foo: {
            bar: {
              '.read': 'false'
            },
            baz: {
              '.read': 'true'
            }
          }
        }
      };
      const data = null;
      const db = database.create(rules, data);

      expect(db.read('foo').allowed).to.be.false();
      expect(db.read('foo/bar').allowed).to.be.false();
      expect(db.read('foo/baz').allowed).to.be.true();
    });

    it('should propagate variables in path', function() {
      const rules = {
        rules: {
          $a: {
            $b: {
              '.read': 'false',
              $c: {
                '.read': '$a != $b && $b != $c'
              }
            }
          }
        }
      };
      const data = null;
      const db = database.create(rules, data);

      expect(db.read('foo/foo/foo').allowed).to.be.false();
      expect(db.read('foo/foo/bar').allowed).to.be.false();
      expect(db.read('foo/bar/baz').allowed).to.be.true();
    });

    it('should have access to data', function() {
      const rules = {
        rules: {
          '.read': 'false',
          foo: {
            bar: {
              '.read': 'data.val() == true'
            },
            baz: {
              '.read': 'data.val() == true'
            },
            fooz: {
              '.read': 'root.child("foo/bar").val() == true'
            },
            qux: {
              '.read': 'root.child("foo/baz").val() == true'
            }
          }
        }
      };
      const data = {
        foo: {
          bar: false,
          baz: true
        }
      };
      const db = database.create(rules, data);

      expect(db.read('foo/bar').allowed).to.be.false();
      expect(db.read('foo/baz').allowed).to.be.true();
      expect(db.read('foo/fooz').allowed).to.be.false();
      expect(db.read('foo/qux').allowed).to.be.true();
    });

    it('should have access to auth', function() {
      const rules = {
        rules: {
          '.read': 'auth.isAdmin == true',
          foo: {
            bar: {
              '.read': 'auth.isUser == true'
            }
          }
        }
      };
      const data = null;
      const db = database.create(rules, data);

      const user = {isUser: true};
      const admin = {isAdmin: true};

      expect(db.as(null).read('foo').allowed).to.be.false();
      expect(db.as(user).read('foo').allowed).to.be.false();
      expect(db.as(admin).read('foo').allowed).to.be.true();

      expect(db.as(null).read('foo/bar').allowed).to.be.false();
      expect(db.as(user).read('foo/bar').allowed).to.be.true();
      expect(db.as(admin).read('foo/bar').allowed).to.be.true();
    });

    it('should traverse all read rules while read is denied', function() {
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
      const data = null;
      const db = database.create(rules, data);
      const result = db.read('foo/bar/baz');

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
      const data = null;
      const db = database.create(rules, data);
      const result = db.read('foo/bar/baz');

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
      const data = null;
      const db = database.create(rules, data);
      const result = db.read('foo/bar/baz');

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
      const data = {a: 1};
      const db = database.create(rules, data);

      expect(db.read('/a').allowed).to.be.false();
    });

  });

  describe('#write', function() {

    it('returns the result of attempting to write', function() {
      const rules = {
        rules: {
          foo: {
            bar: {
              '.write': 'false'
            },
            baz: {
              '.write': 'true'
            }
          }
        }
      };
      const data = null;
      const db = database.create(rules, data);

      expect(db.write('foo', true).allowed).to.be.false();
      expect(db.write('foo/bar', true).allowed).to.be.false();
      expect(db.write('foo/baz', true).allowed).to.be.true();
    });

    it('should propagate variables in path', function() {
      const rules = {
        rules: {
          $a: {
            $b: {
              '.write': 'false',
              $c: {
                '.write': '$a != $b && $b != $c'
              }
            }
          }
        }
      };
      const data = null;
      const db = database.create(rules, data);

      expect(db.write('foo/foo/foo', true).allowed).to.be.false();
      expect(db.write('foo/foo/bar', true).allowed).to.be.false();
      expect(db.write('foo/bar/baz', true).allowed).to.be.true();
    });

    it('should prune null keys', function() {
      const rules = {rules: {'.write': true}};
      const data = {a: 1, b: 2};
      const db = database.create(rules, data);

      expect(db.write('/a', null).newRoot.val()).to.deep.equal({b: 2});
      expect(db.write('/', {a: 1, b: {}}).newRoot.val()).to.deep.equal({a: 1});
    });

    it('should prune null keys deeply', function() {
      const rules = {rules: {'.write': true}};
      const data = {a: {b: 2}};
      const db = database.create(rules, data);

      const result = db.write('/a/b', null);

      expect(result.newRoot.val()).to.be.null();
      expect(result.newRoot.child('a').val()).to.be.null();
      expect(result.newRoot.child('a').exists()).to.be.false();
      expect(result.newRoot.val()).to.be.null();
      expect(result.newRoot.exists()).to.be.false();
    });

    it('should match "now" with the server timestamp', function() {
      const rules = {
        rules: {
          '.write': false,
          foo: {
            '.write': 'newData.val() == now'
          }
        }
      };
      const data = null;
      const db = database.create(rules, data);

      expect(db.write('foo', 1).allowed).to.be.false();
      expect(db.write('foo', TS).allowed).to.be.true();
    });

    it('should match "now" with the newData server timestamp', function() {
      const rules = {
        rules: {
          '.write': false,
          foo: {
            '.write': 'newData.val() == now'
          }
        }
      };
      const data = null;
      const now = 12345000;
      const db = database.create(rules, data);

      expect(db.write('foo', now, null, now).allowed).to.be.true();
    });

    it('should not match "now" with the data server timestamp', function() {
      const rules = {
        rules: {
          '.write': false,
          foo: {
            '.write': 'newData.val() == now'
          }
        }
      };
      const data = null;
      const now = 12345000;
      const db = database.create(rules, data, now);

      expect(db.write('foo', now).allowed).to.be.false();
    });

    it('should replace a node, not merge it', function() {
      const rules = {rules: {'.write': true}};
      const data = {
        foo: {
          bar: true,
          baz: true
        }
      };
      const db = database.create(rules, data);

      expect(db.write('foo', null).newData.val()).to.be.null();
      expect(db.write('foo', {qux: true}).newData.val()).to.deep.equal({qux: true});
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
      const data = null;
      const db = database.create(rules, data);

      expect(db.write('foo/bar/baz', true).logs.map(r => r.path)).to.deep.equal([
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
      const data = null;
      const db = database.create(rules, data);

      expect(db.write('foo/bar/baz', true).logs.map(r => r.path)).to.eql(['', 'foo']);
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
      const data = null;
      const db = database.create(rules, data);

      expect(db.write('foo/bar/baz', true).logs.map(r => r.path)).to.eql(['', 'foo/bar/baz']);
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
      const data = null;
      const db = database.create(rules, data);
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
      const data = null;
      const db = database.create(rules, data);
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
      const data = null;
      const db = database.create(rules, data);
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
      const data = null;
      const db = database.create(rules, data);
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
      const data = null;
      const db = database.create(rules, data);

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
      const data = null;
      const db = database.create(rules, data);

      expect(db.write('/a', 2).allowed).to.be.false();
    });

  });

  describe('#update', function() {

    it('should allow permitted write', function() {
      const rules = {
        rules: {
          '.write': 'false',
          bar: {
            '.write': true
          },
          $other: {
            '.write': false
          }
        }
      };
      const data = null;
      const db = database.create(rules, data);

      const bar = true;
      const baz = true;

      expect(db.update('/', {bar}).allowed).to.be.true();
      expect(db.update('/', {bar, baz}).allowed).to.be.false();
    });

    it('should allow validated write', function() {
      const rules = {
        rules: {
          '.write': 'true',
          bar: {
            '.validate': true
          },
          $other: {
            '.validate': false
          }
        }
      };
      const data = null;
      const db = database.create(rules, data);

      const bar = true;
      const baz = true;

      expect(db.update('/', {bar}).allowed).to.be.true();
      expect(db.update('/', {bar, baz}).allowed).to.be.false();
    });

    it('should match "now" with the server timestamp', function() {
      const rules = {
        rules: {
          '.write': 'false',
          $key: {
            '.write': 'newData.val() == now'
          }
        }
      };
      const data = null;
      const db = database.create(rules, data);

      const foo = TS;
      const bar = TS;
      const baz = 12345000;

      expect(db.update('/', {foo, bar, baz}).allowed).to.be.false();
      expect(db.update('/', {foo, bar}).allowed).to.be.true();
    });

    it('should match "now" with the newData server timestamp', function() {
      const rules = {
        rules: {
          '.write': 'false',
          $key: {
            '.write': 'newData.val() == now'
          }
        }
      };
      const data = null;
      const db = database.create(rules, data);

      const now = 12345000;
      const foo = now;
      const bar = now;

      expect(db.update('/', {foo, bar}, now).allowed).to.be.true();
    });

    it('should not match "now" with the data server timestamp', function() {
      const rules = {
        rules: {
          '.write': 'false',
          $key: {
            '.write': 'newData.val() == now'
          }
        }
      };
      const data = null;
      const now = 12345000;
      const db = database.create(rules, data, now);

      const foo = now;
      const bar = now;

      expect(db.update('/', {foo, bar}).allowed).to.be.false();
    });

    it('should propagate variables in path', function() {
      const rules = {
        rules: {
          '.write': 'false',
          $a: {
            $b: {
              $c: {
                '.write': '$a != $b && $b != $c'
              }
            }
          }
        }
      };
      const data = null;
      const db = database.create(rules, data);

      expect(db.update('/', {
        'foo/foo/baz': true,
        'foo/bar/bar': true
      }).allowed).to.be.false();

      expect(db.update('/', {
        'foo/bar/baz': true,
        'foo/bar/bar': true
      }).allowed).to.be.false();

      expect(db.update('/', {
        'foo/bar/baz': true,
        'foo/bar/qux': true
      }).allowed).to.be.true();
    });

    it('should handle empty patch', function() {
      const rules = {
        rules: {
          '.write': 'true'
        }
      };
      const data = {foo: 1};
      const db = database.create(rules, data);
      const result = db.update('/', {});

      expect(result.allowed).to.be.true();
      expect(result.newData.val()).to.eql({foo: 1});
    });

    it('should handle trailing slashes', function() {
      const rules = {
        rules: {
          invites: {
            $key: {
              '.validate': 'newData.hasChildren(["createdAt"])',
              createdAt: {
                '.validate': 'newData.isNumber()'
              }
            },
            '.write': true
          }
        }
      };
      const data = null;
      const db = database.create(rules, data);

      expect(db.update('/', {'invites/someKey': {createdAt: 1508598138982}}).allowed).to.be.true();
      expect(db.update('/', {'invites/someKey': {createdAt: 'some time ago'}}).allowed).to.be.false();
      expect(db.update('/', {'invites/': {createdAt: 1508598138982}}).allowed).to.be.false();
    });

    it('should prune null node deeply', function() {
      const value = {a: {b: 2}};
      const rules = {rules: {'.write': true}};
      const db = database.create(rules, value);
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
            '.write': 'newData.val().contains("one")'
          }
        }
      };
      const data = null;
      const db = database.create(rules, data);

      expect(db.update('/', {a: 1}).allowed).to.be.false();
    });

    it('should fail on error in validate rules evaluation', function() {
      const rules = {
        rules: {
          a: {
            '.validate': 'newData.val().contains("one")'
          }
        }
      };
      const data = null;
      const db = database.create(rules, data);

      expect(db.update('/', {a: 1}).allowed).to.be.false();
    });

    it('should show no rules were found', function() {
      const rules = {
        rules: {
          foo: {
            '.write': true
          },
          bar: {
            '.validate': true
          }
        }
      };
      const data = {};
      const db = database.create(rules, data).with({debug: true});
      const patch = {
        foo: true,
        bar: true
      };

      const result = db.update('/', patch);

      expect(result.info).to.contain('/bar: write <no rules>');

    });

    it('should show .write rules did no allow the operation', function() {
      const rules = {
        rules: {
          foo: {
            '.write': true
          }
        }
      };
      const data = {};
      const db = database.create(rules, data).with({debug: true});
      const patch = {
        foo: true,
        bar: true
      };

      const result = db.update('/', patch);

      expect(result.info).to.contain('No .write rule allowed the operation.');
      expect(result.info).to.contain('patch was denied.');
    });

  });

});
