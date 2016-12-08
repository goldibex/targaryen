/**
 * Jasmine test definition to test targaryen Jasmine integration.
 */

'use strict';

const targaryen = require('../../plugins/jasmine');
const util = require('../../lib/util');

describe('the targaryen Jasmine plugin', function() {

  beforeEach(function() {
    jasmine.addMatchers(targaryen.matchers);
    util.resetFirebase();
  });

  it('should throw if rules are not set', function() {
    targaryen.setFirebaseData(null);

    expect(() => expect(null).canRead('foo')).toThrow();
    expect(() => expect(null).cannotRead('foo')).toThrow();
    expect(() => expect(null).canWrite('foo', 7)).toThrow();
    expect(() => expect(null).cannotWrite('foo', 7)).toThrow();
  });

  it('should throw if data is not set', function() {
    targaryen.setFirebaseRules({rules: {'.read': true, '.write': true}});

    expect(() => expect(null).canRead('foo')).toThrow();
    expect(() => expect(null).canWrite('foo', 7)).toThrow();

    targaryen.setFirebaseRules({rules: {'.read': false, '.write': false}});

    expect(() => expect(null).cannotRead('foo')).toThrow();
    expect(() => expect(null).cannotWrite('foo', 7)).toThrow();
  });

  it('should test read access', function() {
    targaryen.setFirebaseData(null);
    targaryen.setFirebaseRules({rules: {
      '.read': false,
      foo: {
        bar: {
          '.read': 'auth.uid !== null'
        }
      }
    }});

    expect(targaryen.users.unauthenticated).cannotRead('/');
    expect(targaryen.users.unauthenticated).cannotRead('/foo');
    expect(targaryen.users.unauthenticated).cannotRead('/foo/bar');

    expect(targaryen.users.facebook).cannotRead('/');
    expect(targaryen.users.facebook).cannotRead('/foo');
    expect(targaryen.users.facebook).canRead('/foo/bar');
  });

  it('should test write access', function() {
    targaryen.setFirebaseData(null);
    targaryen.setFirebaseRules({rules: {
      '.write': false,
      foo: {
        bar: {
          '.write': 'auth.uid !== null',
          '.validate': 'newData.val() > 1'
        }
      }
    }});

    expect(targaryen.users.unauthenticated).cannotWrite('/', 2);
    expect(targaryen.users.unauthenticated).cannotWrite('/foo', 2);
    expect(targaryen.users.unauthenticated).cannotWrite('/foo/bar', 1);
    expect(targaryen.users.unauthenticated).cannotWrite('/foo/bar', 2);

    expect(targaryen.users.facebook).cannotWrite('/', 2);
    expect(targaryen.users.facebook).cannotWrite('/foo', 2);
    expect(targaryen.users.facebook).cannotWrite('/foo/bar', 1);
    expect(targaryen.users.facebook).canWrite('/foo/bar', 2);
  });

  it('should test multi write access', function() {
    targaryen.setFirebaseData(null);
    targaryen.setFirebaseRules({rules: {
      '.write': false,
      foo: {
        $key: {
          '.write': 'auth.uid !== null',
          '.validate': 'newData.val() > 1'
        }
      }
    }});

    expect(targaryen.users.unauthenticated).cannotPatch('/', {foo: {bar: 2, baz: 2}});
    expect(targaryen.users.unauthenticated).cannotPatch('/', {'foo/bar': 1, 'foo/baz': 2});
    expect(targaryen.users.unauthenticated).cannotPatch('/', {'foo/bar': 2, 'foo/baz': 2});
    expect(targaryen.users.unauthenticated).cannotPatch('/foo', {bar: 1, baz: 2});
    expect(targaryen.users.unauthenticated).cannotPatch('/foo', {bar: 2, baz: 2});

    expect(targaryen.users.facebook).cannotPatch('/', {foo: {bar: 2, baz: 2}});
    expect(targaryen.users.facebook).cannotPatch('/', {'foo/bar': 1, 'foo/baz': 2});
    expect(targaryen.users.facebook).canPatch('/', {'foo/bar': 2, 'foo/baz': 2});
    expect(targaryen.users.facebook).cannotPatch('/foo', {bar: 1, baz: 2});
    expect(targaryen.users.facebook).canPatch('/foo', {bar: 2, baz: 2});
  });

  it('can set operation time stamp', function() {
    targaryen.setFirebaseData({foo: 2000});
    targaryen.setFirebaseRules({
      rules: {
        $key: {
          '.read': 'data.val() > now',
          '.write': 'newData.val() == now'
        }
      }
    });

    expect(null).canRead('/foo', 1000);
    expect(null).cannotRead('/foo');

    expect(null).canWrite('/foo', {'.sv': 'timestamp'}, 1000);
    expect(null).canWrite('/foo', {'.sv': 'timestamp'});

    expect(null).canWrite('/foo', 1000, 1000);
    expect(null).cannotWrite('/foo', 1000, 2000);

    expect(null).canPatch('/', {foo: {'.sv': 'timestamp'}}, 1000);
    expect(null).canPatch('/', {foo: {'.sv': 'timestamp'}});

    expect(null).canPatch('/', {foo: 1000}, 1000);
    expect(null).cannotPatch('/', {foo: 1000}, 2000);
  });

});
