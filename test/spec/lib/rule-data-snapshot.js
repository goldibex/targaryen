
'use strict';

var RuleDataSnapshot = require('../../../lib/rule-data-snapshot');

var rootObj = {
  '.priority': 'hello',
  users: {
    'password:c7ec6752-45b3-404f-a2b9-7df07b78d28e': {
      '.priority': 1,
      name: { '.value': 'Sherlock Holmes' },
      genius: { '.value': true },
      arrests: { '.value': 70 }
    },
    'password:500f6e96-92c6-4f60-ad5d-207253aee4d3': {
      '.priority': 2,
      name: { '.value': 'John Watson' }
    },
    'password:3403291b-fdc9-4995-9a54-9656241c835d': {
      '.priority': 0,
      name: { '.value': 'Inspector Lestrade'},
      arrests: { '.value': 35 }
    },
    'password:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx': {
      '.priority': 0,
      '.value': null
    }
  }
};

var root = new RuleDataSnapshot(rootObj);

describe('RuleDataSnapshot', function() {

  it('should take the server timestamp as optional argument', function() {
    var now = 12345000,
      snapshot1 = new RuleDataSnapshot({}),
      snapshot2 = new RuleDataSnapshot({}, 'foo/bar'),
      snapshot3 = new RuleDataSnapshot({}, now),
      snapshot4 = new RuleDataSnapshot({}, now, 'foo/bar');

    expect(snapshot1._timestamp).not.to.be.NaN;
    expect(snapshot1._path).to.be.undefined;

    expect(snapshot2._timestamp).not.to.be.NaN;
    expect(snapshot2._path).to.equal('foo/bar');

    expect(snapshot3._timestamp).to.equal(now);
    expect(snapshot3._path).to.be.undefined;

    expect(snapshot4._timestamp).to.equal(now);
    expect(snapshot4._path).to.equal('foo/bar');
  });

  describe('create', function() {

    it('should create a new snapshot', function() {
      expect(RuleDataSnapshot.create('foo/bar/baz', 1).val()).to.eql({
        foo: {
          bar: {
            baz: 1
          }
        }
      });
    });

  });

  describe('convert', function() {

    it('converts plain Javascript objects into Firebase data format', function() {

      expect(RuleDataSnapshot.convert(true)).to.deep.equal({
        '.value': true,
        '.priority': null
      });

      expect(RuleDataSnapshot.convert({ foo: { bar: true, baz: true, quxEmpty: {}, quxNull: null} }))
      .to.deep.equal({
        '.priority': null,
        foo: {
          '.priority': null,
          bar: {
            '.value': true,
            '.priority': null
          },
          baz: {
            '.value': true,
            '.priority': null
          },
          quxEmpty: {
            '.value': null,
            '.priority': null
          },
          quxNull: {
            '.value': null,
            '.priority': null
          }
        }

      });

    });

    it('transparently handles values for which value and priority are already set', function() {

      expect(RuleDataSnapshot.convert({ foo: { '.value': true, '.priority': 5}, bar: 8 }))
      .to.deep.equal({
        '.priority': null,
        foo: {
          '.value': true,
          '.priority': 5
        },
        bar: {
          '.value': 8,
          '.priority': null
        }
      });
    });

    it('transparently handles objects for which a priority is set in the root', function() {
      expect(RuleDataSnapshot.convert({ '.priority': 100, foo: { '.value': true, '.priority': 5}, bar: 8 }))
          .to.deep.equal({
        '.priority': 100,
        foo: {
          '.value': true,
          '.priority': 5
        },
        bar: {
          '.value': 8,
          '.priority': null
        }
      });
    });

    it('converts "timestamp" server value', function() {
      var now = 12345000;

      expect(RuleDataSnapshot.convert({'.sv': 'timestamp'}, now)).to.deep.equal({
        '.value': now,
        '.priority': null
      });
    });
  });

  describe('#merge', function() {

    it('should merge snapshot data', function() {
      var snapshot1 = new RuleDataSnapshot({foo: {'.value': 1}}),
        snapshot2 = new RuleDataSnapshot({bar: {'.value': 2}}),
        mergedSnapshot = snapshot1.merge(snapshot2);

      expect(mergedSnapshot).not.to.equal(snapshot1);
      expect(mergedSnapshot).not.to.equal(snapshot2);
      expect(mergedSnapshot.child('foo').val()).to.equal(1);
      expect(mergedSnapshot.child('bar').val()).to.equal(2);
    });

    it('should conserve the timestamp', function() {
      var now = 12345000,
        snapshot1 = new RuleDataSnapshot({foo: {'.value': 1}}, now - 1000),
        snapshot2 = new RuleDataSnapshot({bar: {'.value': 2}}, now),
        mergedSnapshot = snapshot1.merge(snapshot2);

        expect(mergedSnapshot._timestamp).to.equal(now);
    });

    it('can set a node to null', function() {
      var patch = new RuleDataSnapshot({users: {'.value': null, '.priority': null}});
      var newDataRoot = root.merge(patch);

      expect(newDataRoot.child('users/password:c7ec6752-45b3-404f-a2b9-7df07b78d28e').exists()).to.be.false;
    });

    it('treats empty object as null', function() {
      var patch = new RuleDataSnapshot(RuleDataSnapshot.convert({users: {}}));
      var newDataRoot = root.merge(patch);

      expect(newDataRoot.child('users').exists()).to.be.false;
    });

    it('can override null', function() {
      var patch = new RuleDataSnapshot({users: {
        'password:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx': {
          name: {'.value': 'James Moriarty'},
          genius: {'.value': true},
          arrests: {'.value': 0 }
        }
      }});
      var newDataRoot = root.merge(patch);


      expect(newDataRoot.child('users/password:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx').val()).to.deep.equal({
        name: 'James Moriarty',
        genius: true,
        arrests: 0
      });
    });

    it('can override other literal value and keep their priority', function() {
      var patch = new RuleDataSnapshot({
        users: {
          'password:c7ec6752-45b3-404f-a2b9-7df07b78d28e': {
            '.value': null
          }
        }
      });
      var newDataRoot = root.merge(patch);

      expect(newDataRoot.child('users/password:c7ec6752-45b3-404f-a2b9-7df07b78d28e').getPriority()).to.equal(1);
    });

  });

  describe('#set', function() {

    it('should replace the root data', function() {
      expect(root.set('/', {foo: 1}).val()).to.eql({foo: 1});
    });

    it('should replace a node', function() {
      const path = 'users/password:c7ec6752-45b3-404f-a2b9-7df07b78d28e';
      const newRoot = root.set(path, {
        name: 'Sherlock Holmes',
        genius: true
      });

      expect(newRoot.child(path).val()).to.eql({
        name: 'Sherlock Holmes',
        genius: true
      });
    });

    it('should replace a literal node', function() {
      const path = 'users/password:c7ec6752-45b3-404f-a2b9-7df07b78d28e/arrests';
      const newRoot = root.set(path, {first: 1887, second: 1887});

      expect(newRoot.child(path).val()).to.eql({first: 1887, second: 1887});
    });

    it('should replace node with a literal', function() {
      const path = 'users/password:c7ec6752-45b3-404f-a2b9-7df07b78d28e/arrests';
      const newRoot = root.set(path, null);

      expect(newRoot.child(path).val()).to.equal(null);
    });

    it('should preserve the priority', function() {
      const path = 'users/password:c7ec6752-45b3-404f-a2b9-7df07b78d28e';
      const newRoot = root.set(path, {
        name: 'Sherlock Holmes',
        genius: true
      });

      expect(newRoot.child(path).getPriority()).to.equal(1);
    });

  });

  describe('#val', function() {

    it('gets the value at the specified path', function() {

      expect(root.val()).to.deep.equal({
        users: {
          'password:c7ec6752-45b3-404f-a2b9-7df07b78d28e': { name: 'Sherlock Holmes', genius: true, arrests: 70 },
          'password:500f6e96-92c6-4f60-ad5d-207253aee4d3': { name: 'John Watson' },
          'password:3403291b-fdc9-4995-9a54-9656241c835d': { name: 'Inspector Lestrade', arrests: 35 },
          'password:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx': null
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
      expect(root.child('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3').child('name').val())
      .to.equal('John Watson');
    });

    it('should conserve the timestamp', function() {
      var now = 12345000,
        snapshot = new RuleDataSnapshot({foo: {'.value': 1}}, now);

        expect(snapshot.child('foo')._timestamp).to.equal(now);
    });

  });

  describe('#parent', function() {

    it('gets the parent of the snap', function() {

      expect(root.child('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/name').parent().val())
      .to.deep.equal({
        name: 'John Watson'
      });

    });

    it('returns null if we are at the top', function() {
      expect(root.parent()).to.be.null;
    });

    it('should conserve the timestamp', function() {
      var now = 12345000,
        snapshot = new RuleDataSnapshot({foo: {'.value': 1}}, now);

        expect(snapshot.child('foo').parent()._timestamp).to.equal(now);
    });

  });

  describe('#exists', function() {

    it('returns true if some data is at that key', function() {
      expect(root.child('users').exists()).to.be.true;
    });

    it('returns false if no data is at that key', function() {
      expect(root.child('nonexistent').exists()).to.be.false;
    });

  });

  describe('#hasChild', function() {

    it('returns true if the path has a child with the given name', function() {
      expect(root.hasChild('users')).to.be.true;
    });

    it('returns false if the path does not have a child with the given name', function() {
      expect(root.hasChild('nonexistent')).to.be.false;
    });

  });

  describe('#hasChildren', function() {

    describe('with no arguments', function() {

      it('returns true if the path has any children at all', function() {
        expect(root.child('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3').hasChildren()).to.be.true;
      });

      it('returns false if the path has no children', function() {
        expect(root.child('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/name').hasChildren()).to.be.false;
      });

    });

    describe('with an array of child names', function() {

      it('returns true if the path has all the specified children', function() {

        expect(root.child('users/password:c7ec6752-45b3-404f-a2b9-7df07b78d28e').hasChildren(['name', 'genius', 'arrests']))
        .to.be.true;

      });

      it('returns false if the path is missing even one of the specified children', function() {
        expect(root.child('users/password:3403291b-fdc9-4995-9a54-9656241c835d').hasChildren(['name', 'genius', 'arrests']))
        .to.be.false;
      });

    });

  });

  describe('#isNumber', function() {

    it('returns true if the value at the path has type number', function() {
      expect(root.child('users/password:3403291b-fdc9-4995-9a54-9656241c835d/arrests').isNumber()).to.be.true;
    });

    it('returns false if the value at the path does not have type number', function() {
      expect(root.child('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/arrests').isNumber()).to.be.false;
    });

  });

  describe('#isBoolean', function() {

    it('returns true if the value at the path has type boolean', function() {
      expect(root.child('users/password:c7ec6752-45b3-404f-a2b9-7df07b78d28e/genius').isBoolean()).to.be.true;
    });

    it('returns false if the value at the path does not have type boolean', function() {
      expect(root.child('users/password:3403291b-fdc9-4995-9a54-9656241c835d/name').isBoolean()).to.be.false;
    });

  });

  describe('#isString', function() {

    it('returns true if the value at the path has type string', function() {
      expect(root.child('users/password:3403291b-fdc9-4995-9a54-9656241c835d/name').isString()).to.be.true;
    });

    it('returns false if the value at the path does not have type string', function() {
      expect(root.child('users/password:3403291b-fdc9-4995-9a54-9656241c835d').isString()).to.be.false;
    });

  });

});
