
'use strict';

var RuleDataSnapshot = require('../../../lib/rule-data-snapshot');

var rootObj = {
  '.priority': 'hello',
  users: {
    'simplelogin:0': {
      '.priority': 1,
      name: { '.value': 'Sherlock Holmes' },
      genius: { '.value': true },
      arrests: { '.value': 70 }
    },
    'simplelogin:1': {
      '.priority': 2,
      name: { '.value': 'John Watson' }
    },
    'simplelogin:2': {
      '.priority': 0,
      name: { '.value': 'Inspector Lestrade'},
      arrests: { '.value': 35 }
    }
  }
};

var root = new RuleDataSnapshot(rootObj);

describe('RuleDataSnapshot', function() {

  describe('convert', function() {

    it('converts plain Javascript objects into Firebase data format', function() {

      expect(RuleDataSnapshot.convert(true)).to.deep.equal({
        '.value': true,
        '.priority': null
      });

      expect(RuleDataSnapshot.convert({ foo: { bar: true, baz: true } }))
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

  });

  describe('#val', function() {

    it('gets the value at the specified path', function() {

      expect(root.val()).to.deep.equal({
        users: {
          'simplelogin:0': { name: 'Sherlock Holmes', genius: true, arrests: 70 },
          'simplelogin:1': { name: 'John Watson' },
          'simplelogin:2': { name: 'Inspector Lestrade', arrests: 35 }
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
      expect(root.child('users/simplelogin:1').child('name').val())
      .to.equal('John Watson');
    });

  });

  describe('#parent', function() {

    it('gets the parent of the snap', function() {

      expect(root.child('users/simplelogin:1/name').parent().val())
      .to.deep.equal({
        name: 'John Watson'
      });

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
        expect(root.child('users/simplelogin:1').hasChildren()).to.be.true;
      });

      it('returns false if the path has no children', function() {
        expect(root.child('users/simplelogin:1/name').hasChildren()).to.be.false;
      });

    });

    describe('with an array of child names', function() {

      it('returns true if the path has all the specified children', function() {

        expect(root.child('users/simplelogin:0').hasChildren(['name', 'genius', 'arrests']))
        .to.be.true;

      });

      it('returns false if the path is missing even one of the specified children', function() {
        expect(root.child('users/simplelogin:2').hasChildren(['name', 'genius', 'arrests']))
        .to.be.false;
      });

    });

  });

  describe('#isNumber', function() {

    it('returns true if the value at the path has type number', function() {
      expect(root.child('users/simplelogin:2/arrests').isNumber()).to.be.true;
    });

    it('returns false if the value at the path does not have type number', function() {
      expect(root.child('users/simplelogin:1/arrests').isNumber()).to.be.false;
    });

  });

  describe('#isBoolean', function() {

    it('returns true if the value at the path has type boolean', function() {
      expect(root.child('users/simplelogin:0/genius').isBoolean()).to.be.true;
    });

    it('returns false if the value at the path does not have type boolean', function() {
      expect(root.child('users/simplelogin:2/name').isBoolean()).to.be.false;
    });

  });

  describe('#isString', function() {

    it('returns true if the value at the path has type string', function() {
      expect(root.child('users/simplelogin:2/name').isString()).to.be.true;
    });

    it('returns false if the value at the path does not have type string', function() {
      expect(root.child('users/simplelogin:2').isString()).to.be.false;
    });

  });

});
