
'use strict';

const database = require('../../../lib/database');

describe('RuleDataSnapshot', function() {
  let root;

  beforeEach(function() {
    root = database.snapshot('/', {
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
          'password:c7ec6752-45b3-404f-a2b9-7df07b78d28e': { name: 'Sherlock Holmes', genius: true, arrests: 70 },
          'password:500f6e96-92c6-4f60-ad5d-207253aee4d3': { name: 'John Watson' },
          'password:3403291b-fdc9-4995-9a54-9656241c835d': { name: 'Inspector Lestrade', arrests: 35 }
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
      expect(root.parent()).to.be.null;
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
        expect(
          root
            .child('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3')
            .hasChildren()
        ).to.be.true;
      });

      it('returns false if the path has no children', function() {
        expect(
          root
            .child('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/name')
            .hasChildren()
        ).to.be.false;
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
        ).to.be.true;

      });

      it('returns false if the path is missing even one of the specified children', function() {
        expect(
          root
            .child('users/password:3403291b-fdc9-4995-9a54-9656241c835d')
            .hasChildren(['name', 'genius', 'arrests'])
        ).to.be.false;
      });

    });

  });

  describe('#isNumber', function() {

    it('returns true if the value at the path has type number', function() {
      expect(
        root
          .child('users/password:3403291b-fdc9-4995-9a54-9656241c835d/arrests')
          .isNumber()
      ).to.be.true;
    });

    it('returns false if the value at the path does not have type number', function() {
      expect(
        root
          .child('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/arrests')
          .isNumber()
      ).to.be.false;
    });

  });

  describe('#isBoolean', function() {

    it('returns true if the value at the path has type boolean', function() {
      expect(
        root
          .child('users/password:c7ec6752-45b3-404f-a2b9-7df07b78d28e/genius')
          .isBoolean()
      ).to.be.true;
    });

    it('returns false if the value at the path does not have type boolean', function() {
      expect(
        root
          .child('users/password:3403291b-fdc9-4995-9a54-9656241c835d/name')
          .isBoolean()
      ).to.be.false;
    });

  });

  describe('#isString', function() {

    it('returns true if the value at the path has type string', function() {
      expect(
        root
          .child('users/password:3403291b-fdc9-4995-9a54-9656241c835d/name')
          .isString()
      ).to.be.true;
    });

    it('returns false if the value at the path does not have type string', function() {
      expect(
        root
          .child('users/password:3403291b-fdc9-4995-9a54-9656241c835d')
          .isString()
      ).to.be.false;
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
