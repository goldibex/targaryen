/**
 * Test firebase data structure validation and navigation.
 */

'use strict';

const store = require('../../../../lib/database/store');

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
    expect(store.create().$value()).to.equal(null);
    expect(store.create(null).$value()).to.equal(null);
    expect(store.create({}).$value()).to.equal(null);
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

    expect(data.$value()).to.eql(plain);
    expect(data.a.$value()).to.equal(1);
    expect(data.b.$value()).to.eql({c: {d: 2}});
    expect(data.b.c.$value()).to.eql({d: 2});
    expect(data.b.c.d.$value()).to.equal(2);
  });

  it('should create a three at a path', function() {
    const data = store.create(2, {path: 'b/c/d'});

    expect(data.$value()).to.eql({b: {c: {d: 2}}});
  });

  [true, 'two', 3, [1, 2, 3], null].forEach(function(v) {
    let vType = typeof v;

    if (vType === 'object') {
      vType = v == null ? 'null' : v.constructor.name;
    }

    it(`should let  ${vType} be used as value`, function() {
      expect(() => store.create(v)).to.not.throw();
      expect(() => store.create({v})).to.not.throw();
    });
  });

  [new Date(), /foo/].forEach(function(v) {
    it(`should not let ${v.constructor.name} be used as value`, function() {
      expect(() => store.create(v)).to.throw();
      expect(() => store.create({v})).to.throw();
    });
  });

  describe('should throw when creating a node with an invalid name:', function() {

    ['.', '#', '$', '[', ']'].forEach(char => {
      const data = {[`a${char}c`]: 1};

      it(`e.g. using "${char}"`, () => expect(() => store.create(data)).to.throw());
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

      // expect(data.timestamp).to.equal(1234);
      expect(data.a.$value()).to.equal(1234);
      expect(data.b.c.d.$value()).to.equal(1234);
    });

    it('should throw with unknown type', function() {
      const plain = {a: {'.sv': 'foo'}};

      expect(() => store.create(plain)).to.throw();
    });

  });

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
      expect(data.a.$priority()).to.be.undefined();
      expect(data.b.c.d.$priority()).to.equal(priority);
    });

    it('should return the node priority set with explicite priority', function() {
      const value = 3;

      data = store.create();

      expect(data.$set('foo', value).foo.$priority()).to.undefined();
      expect(data.$set('foo', value, 1).foo.$priority()).to.equal(1);
      expect(data.$set('foo', value, 'something').foo.$priority()).to.equal('something');
    });

    it('should throw when setting invalid priority', function() {
      expect(() => store.create({'.value': 1, '.priority': {foo: 'bar'}})).to.throw();
      expect(() => store.create({'.value': 1, '.priority': true})).to.throw();

      const value = 3;

      data = store.create();

      expect(() => data.$set('foo', value, true)).to.throw();
      expect(() => data.$set('foo', value, {foo: 'bar'})).to.throw();
    });

    it('should return the node priority set with explicite priority', function() {
      data = store.create().$set('a', 3, priority);

      expect(data.a.$priority()).to.equal(priority);
    });

    it('should return the node priority of a timestamp', function() {
      const plain = {
        a: {
          '.sv': 'timestamp',
          '.priority': priority
        }
      };

      data = store.create(plain, {now: 1234});

      expect(data.a.$value()).to.equal(1234);
      expect(data.a.$priority()).to.equal(priority);
    });

  });

  describe('#$isPrimitive', function() {
    let data;

    beforeEach(function() {
      data = store.create({a: 1}).$set('b/c/d', 2);
    });

    it('should return the node isPrimitive', function() {
      expect(data.a.$isPrimitive()).to.be.true();
      expect(data.b.$isPrimitive()).to.be.false();
    });

  });

  describe('#$set', function() {
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
      const newRoot = data.$set('/', 3);

      expect(data.a.$value()).to.equal(1);
      expect(newRoot.$value()).to.equal(3);
    });

    it('should return a new tree with updated values', function() {
      const newRoot = data.$set('a', 3);

      expect(data.a.$value()).to.equal(1);
      expect(newRoot.a.$value()).to.equal(3);
    });

    it('should return a new tree with updated deep values', function() {
      const newRoot = data.$set('b/c/d', 3);

      expect(data.b.c.d.$value()).to.equal(2);
      expect(newRoot.b.c.d.$value()).to.equal(3);
    });

    it('should return a new tree with removed branches', function() {
      const newRoot = data.$set('a', null);

      expect(data.a.$value()).to.equal(1);
      expect(newRoot).not.to.have.property('a');
    });

    it('should return a new tree without empty branches', function() {
      const newRoot = data.$set('b/c', {d: null, e: null});

      expect(data.b.c.d.$value()).to.equal(2);
      expect(newRoot).not.to.have.property('b');
    });

    describe('should throw when the path includes an invalid character:', function() {

      ['.', '#', '$', '[', ']'].forEach(char => {
        it(`e.g. using "${char}"`, () => expect(() => data.$set(`a${char}c`, 1)).to.throw());
      });

    });

  });

  describe('#$merge', function() {
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

    it('should return a new tree with merged data', function() {
      const original = data.$value();
      const newRoot = data.$merge('/', {a: 3, 'b/c/e': 4});

      expect(data.$value()).to.deep.equal(original);
      expect(newRoot.$value()).to.deep.equal({
        a: 3,
        b: {
          c: {
            d: 2,
            e: 4
          }
        }
      });
    });

    it('should return a new tree with removed branches', function() {
      const newRoot = data.$merge('/', {a: null});

      expect(data.a.$value()).to.equal(1);
      expect(newRoot).not.to.have.property('a');
    });

    it('should return a new tree without empty branches', function() {
      const newRoot = data.$merge('b/c', {d: null, e: null, f: 3});

      expect(newRoot.b.c.$value()).to.deep.equal({f: 3});
    });

    it('should handle empty patch', function() {
      expect(data.$merge('b/c', {})).to.equal(data);
    });

    describe('should throw when the path includes an invalid character:', function() {

      ['.', '#', '$', '[', ']'].forEach(char => {
        it(`e.g. using "${char}"`, () => {
          expect(() => data.$merge('/', {a: 3, [`b/c/a${char}c`]: 4})).to.throw();
          expect(() => data.$merge(`/a${char}c`, {a: 3})).to.throw();
        });
      });

    });

  });

  describe('#$remove', function() {
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
      const newRoot = data.$remove('/');

      expect(data.a.$value()).to.equal(1);
      expect(newRoot.$value()).to.equal(null);
    });

    it('should return a new tree with updated values', function() {
      const newRoot = data.$remove('a');

      expect(data.a.$value()).to.equal(1);
      expect(newRoot.$value()).to.eql({b: {c: {d: 2}, e: 3}});
    });

    it('should return a new tree with updated deep values', function() {
      const newRoot = data.$remove('b/c/d');

      expect(data.b.c.d.$value()).to.equal(2);
      expect(newRoot.$value()).to.eql({a: 1, b: {e: 3}});
    });

    it('should remove non existant node', function() {
      const newRoot = data.$remove('/x/y/z');

      expect(newRoot.$value()).to.deep.equal(data.$value());
    });

    it('should copy parent nodes', function() {
      data = store.create({
        a: {
          b: {
            c: true,
            d: true
          },
          e: true
        }
      });

      const newRoot = data.$remove('a/b/c');

      expect(newRoot.$value()).to.eql({a: {b: {d: true}, e: true}});
    });

    describe('should throw when the path includes an invalid character:', function() {

      ['.', '#', '$', '[', ']'].forEach(char => {
        it(`e.g. using "${char}"`, () => expect(() => data.$remove(`/a${char}c`)).to.throw());
      });

    });

  });

  describe('#$child', function() {
    let data;

    beforeEach(function() {
      data = store.create(2, {path: 'b/c/d'});
    });

    it('should return the node at specific path', function() {
      expect(data.$child('b/c/d').$value()).to.equal(2);
    });

    it('should return a node if no node exists at a specific path', function() {
      expect(data.$child('foo/bar').$value()).to.equal(null);
    });

    describe('should throw when the path includes an invalid character:', function() {

      ['.', '#', '$', '[', ']'].forEach(char => {
        it(`e.g. using "${char}"`, () => expect(() => data.$child(`a${char}c`)).to.throw());
      });

    });

  });

});
