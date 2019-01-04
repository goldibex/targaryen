/**
 * Test firebase string methods.
 */

'use strict';

const stringMethods = require('../../../../lib/parser/string-methods');

describe('stringMethods', function() {

  describe('contains', function() {

    it('returns true if the given string contains the given substring', function() {
      expect(stringMethods.contains('bar', 'ar')).to.be.true();
    });

    it('returns false if the given string does not contain the given substring', function() {
      expect(stringMethods.contains('bar', 'war')).to.be.false();
    });

  });

  describe('beginsWith', function() {

    it('returns true if the given string begins with the given substring', function() {
      expect(stringMethods.beginsWith('bar', 'ba')).to.be.true();
    });

    it('returns false if the given string does not begin with the given substring', function() {
      expect(stringMethods.beginsWith('bar', 'wa')).to.be.false();
    });

  });

  describe('endsWith', function() {

    it('returns true if the given string ends with the given substring', function() {
      expect(stringMethods.endsWith('bar', 'ar')).to.be.true();
      expect(stringMethods.endsWith('arbar', 'ar')).to.be.true();
    });

    it('returns false if the given string does not end with the given substring', function() {
      expect(stringMethods.endsWith('bar', 'az')).to.be.false();
      expect(stringMethods.endsWith('', 'az')).to.be.false();
    });

  });

  describe('replace', function() {

    it('returns a string where all instances of the target string are replaced by the replacement', function() {
      expect(stringMethods.replace('barar', 'ar', 'az')).to.equal('bazaz');
    });

  });

  describe('matches', function() {

    it('returns true if the given string matches the given regex', function() {
      expect(stringMethods.matches('bar', /^ba/)).to.be.true();
    });

    it('returns false if the given string does not match the given regex', function() {
      expect(stringMethods.matches('bar', /^wa/)).to.be.false();
    });

  });

});
