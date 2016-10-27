'use strict';

const helpers = require('../../../lib/helpers.js');

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

});
