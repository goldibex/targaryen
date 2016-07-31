'use strict';

var helpers = require('../../../lib/helpers.js'),
    RuleDataSnapshot = require('../../../lib/rule-data-snapshot');

describe('helpers', function() {

  describe('pathMerger', function() {

    it('should merge path', function() {
      expect(helpers.pathMerger('foo', 'bar/baz')).to.equal('foo/bar/baz');
    });

    it('should trim root path', function() {
      expect(helpers.pathMerger('/foo/', 'bar/baz')).to.equal('foo/bar/baz');
    });

    it('should trim the beginning of the path', function() {
      expect(helpers.pathMerger('foo', '/bar/baz')).to.equal('foo/bar/baz');
    });

  });

  describe('pathSplitter', function() {

    it('should split the path', function() {
      expect(helpers.pathSplitter('foo/bar/baz')).to.eql(['foo', 'bar', 'baz']);
    });

    it('should trim the beginning of the path', function() {
      expect(helpers.pathSplitter('/foo/bar/baz')).to.eql(['foo', 'bar', 'baz']);
    });

  });

  describe('makeNewDataSnap', function() {

    it('should create a snapshot for the path', function() {
      var snapshot = helpers.makeNewDataSnap('foo/bar/baz', 1);

      expect(snapshot).to.eql(new RuleDataSnapshot({
        foo: {
          bar: {
            baz: {
              '.value': 1,
              '.priority': null
            }
          }
        }
      }));
    });

    it('should trim the begining of the path', function() {
      var snapshot = helpers.makeNewDataSnap('/foo/bar/baz', 1);

      expect(snapshot).to.eql(new RuleDataSnapshot({
        foo: {
          bar: {
            baz: {
              '.value': 1,
              '.priority': null
            }
          }
        }
      }));
    });

  });

});
