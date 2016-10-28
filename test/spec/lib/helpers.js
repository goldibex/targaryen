'use strict';

var helpers = require('../../../lib/helpers.js'),
    RuleDataSnapshot = require('../../../lib/rule-data-snapshot');

describe('helpers', function() {

  describe('pathMerger', function() {

    it('should merge path', function() {
      expect(helpers.pathMerger('foo', 'bar/baz')).to.equal('foo/bar/baz');
      expect(helpers.pathMerger('foo', '')).to.equal('foo');
      expect(helpers.pathMerger('', 'bar/baz')).to.equal('bar/baz');
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

    it('should no split empty path', function() {
      expect(helpers.pathSplitter('')).to.eql([]);
    });


    it('should trim the beginning of the path', function() {
      expect(helpers.pathSplitter('/foo/bar/baz')).to.eql(['foo', 'bar', 'baz']);
    });

  });

  describe('makeNewDataSnap', function() {

    it('should create a snapshot for the path', function() {
      var snapshot = helpers.makeNewDataSnap('foo/bar/baz', 1);

      expect(snapshot.val()).to.eql({
        foo: {
          bar: {
            baz: 1
          }
        }
      });
    });

    it('should trim the begining of the path', function() {
      var snapshot = helpers.makeNewDataSnap('/foo/bar/baz', 1);

      expect(snapshot.val()).to.eql({
        foo: {
          bar: {
            baz: 1
          }
        }
      });
    });

    it('should convert timestamp server values', function() {
      var now = 12345000,
        snapshot = helpers.makeNewDataSnap('foo/bar/baz', {'.sv': 'timestamp'}, now);

      expect(snapshot.val()).to.eql({
        foo: {
          bar: {
            baz: now
          }
        }
      });
    });

  });

});
