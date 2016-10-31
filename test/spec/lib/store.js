'use strict';

const store = require('../../../lib/store');

describe('store', function() {
  const _now = Date.now;

  beforeEach(function() {
    let now = 1000;

    Date.now = () => now++;
  });

  afterEach(function() {
    Date.now = _now;
  });

  it('should create an empty tree by default', function() {
    expect(store.create().root.$value()).to.equal(null);
    expect(store.create(null).root.$value()).to.equal(null);
    expect(store.create({}).root.$value()).to.equal(null);
  });

  it('should create a three', function() {
    const plain = {
      a: 1,
      b: {
        c: {
          d: 2
        }
      }
    };
    const data = store.create(plain);

    expect(data.root.$value()).to.eql(plain);
    expect(data.root.a.$value()).to.equal(1);
    expect(data.root.b.$value()).to.eql({c: {d: 2}});
    expect(data.root.b.c.$value()).to.eql({d: 2});
    expect(data.root.b.c.d.$value()).to.equal(2);
  });

  it('should create a three at a path', function() {
    const data = store.create(2, {path: 'b/c/d'});

    expect(data.root.$value()).to.eql({b: {c: {d: 2}}});
  });

  [true, 'two', 3].forEach(function(v) {
    it(`should let ${typeof v} be used as value`, function() {
      expect(() => store.create(v)).to.not.throw();
      expect(() => store.create({v})).to.not.throw();
    });
  });

  [new Date(), [1,2,3], /foo/].forEach(function(v) {
    it(`should not let ${v.constructor.name} be used as value`, function() {
      expect(() => store.create(v)).to.throw();
      expect(() => store.create({v})).to.throw();
    });
  });

  describe('server value replacement', function() {

    it('should handle time stamps', function() {
      const plain = {
        a: {'.sv': 'timestamp'},
        b: {
          c: {
            d: {'.sv': 'timestamp'}
          }
        }
      };
      const data = store.create(plain, {now: 1234});

      expect(data.timestamp).to.equal(1234);
      expect(data.root.a.$value()).to.equal(1234);
      expect(data.root.b.c.d.$value()).to.equal(1234);
    });

    it('should throw with unknown type', function() {
      const plain = {a: {'.sv': 'foo'}};

      expect(() => store.create(plain)).to.throw();
    });

  });

  describe('#set', function() {
    let data;

    beforeEach(function() {
      data = store.create({
        a: 1,
        b: {
          c: {
            d: 2
          }
        }
      });
    });

    it('should return a new tree with an updated root', function() {
      const newData = data.set('/', 3);

      expect(data.root.a.$value()).to.equal(1);
      expect(newData.root.$value()).to.equal(3);
    });

    it('should return a new tree with updated values', function() {
      const newData = data.set('a', 3);

      expect(data.root.a.$value()).to.equal(1);
      expect(newData.root.a.$value()).to.equal(3);
    });

    it('should return a new tree with updated deep values', function() {
      const newData = data.set('b/c/d', 3);

      expect(data.root.b.c.d.$value()).to.equal(2);
      expect(newData.root.b.c.d.$value()).to.equal(3);
    });

    it('should return a new tree with removed branches', function() {
      const newData = data.set('a', null);

      expect(data.root.a.$value()).to.equal(1);
      expect(newData.root).not.to.have.property('a');
    });

    it('should return a new tree without empty branches', function() {
      const newData = data.set('b/c', {d: null, e: null});

      expect(data.root.b.c.d.$value()).to.equal(2);
      expect(newData.root).not.to.have.property('b');
    });

  });

  describe('#remove', function() {
    let data;

    beforeEach(function() {
      data = store.create({
        a: 1,
        b: {
          c: {d: 2},
          e: 3
        }
      });
    });

    it('should return a new tree with an updated root', function() {
      const newData = data.remove('/');

      expect(data.root.a.$value()).to.equal(1);
      expect(newData.root.$value()).to.equal(null);
    });

    it('should return a new tree with updated values', function() {
      const newData = data.remove('a');

      expect(data.root.a.$value()).to.equal(1);
      expect(newData.root.$value()).to.eql({b: {c: {d: 2}, e: 3}});
    });

    it('should return a new tree with updated deep values', function() {
      const newData = data.remove('b/c/d');

      expect(data.root.b.c.d.$value()).to.equal(2);
      expect(newData.root.$value()).to.eql({a: 1, b: {e: 3}});
    });

  });

  describe('#get', function() {
    let data;

    beforeEach(function() {
      data = store.create(2, {path: 'b/c/d'});
    });

    it('should return the node at specific path', function() {
      expect(data.get('b/c/d').$value()).to.equal(2);
    });

    it('should return a node if no node exists at a specific path', function() {
      expect(data.get('foo/bar').$value()).to.equal(null);
    });

  });

  describe('#walk', function() {
    let data;

    beforeEach(function() {
      data = store.create({
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

      data.walk('b', s => {snaps.push(s.toString());});

      expect(snaps.sort()).to.eql(['b/c', 'b/d', 'b/d/e', 'b/d/e/f']);
    });

    it('should yield nodes in descending order', function() {
      const snaps = [];

      data.walk('b/d', s => {snaps.push(s.toString());});

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

  describe('#root', function() {

    describe('#$priority', function() {
      const priority = 1;
      let data;

      it('should return the node priority', function() {
        data = store.create({
          a: 1,
          b: {
            c: {
              d: {
                '.value': 2,
                '.priority': priority
              }
            }
          }
        });
        expect(data.root.a.$priority()).to.be.undefined;
        expect(data.root.b.c.d.$priority()).to.equal(priority);
      });

      it('should return the node priority set with explicite priority', function() {
        data = store.create().set('a', 3, priority);

        expect(data.root.a.$priority()).to.equal(priority);
      });

      it('should return the node priority of a timestamp', function() {
        const plain = {
          a: {
            '.sv': 'timestamp',
            '.priority': priority
          }
        };

        data = store.create(plain, {now: 1234});

        expect(data.root.a.$value()).to.equal(1234);
        expect(data.root.a.$priority()).to.equal(priority);
      });

    });

    describe('#$isPrimitive', function() {
      let data;

      beforeEach(function() {
        data = store.create({a: 1}).set('b/c/d', 2);
      });

      it('should return the node isPrimitive', function() {
        expect(data.root.a.$isPrimitive()).to.be.true;
        expect(data.root.b.$isPrimitive()).to.be.false;
      });

    });

  });

});
