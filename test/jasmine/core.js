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

  describe('using nested variables in path', function() {

    beforeEach(function() {
      // using double quotes to make the data & rules compatible with Firebase (web interface)

      targaryen.setFirebaseData({
        users: {
          password: {
            'password:500f6e96-92c6-4f60-ad5d-207253aee4d3': {
              name: 'Sherlock Holmes'
            },
            'password:3403291b-fdc9-4995-9a54-9656241c835d': {
              name: 'John Watson'
            }
          }
        },
        first: {
          second: {
            third: {
              any: 'value'
            }
          }
        }
      });

      targaryen.setFirebaseRules({
        rules: {
          users: {
            $provider: {
              $user: {
                // all data is personal (read and write)
                '.read': 'auth !== null && auth.uid === $user && auth.provider === $provider',
                '.write': 'auth !== null && auth.uid === $user && auth.provider === $provider'
              }
            }
          },
          posts: {
            $post: {
              '.read': true,
              '.write': 'newData.child(\'author\').val() == auth.uid'
            }
          },
          $one: {
            $two: {
              $three: {
                '.read': '$one == \'first\' && $two == \'second\' && $three == \'third\''
              }
            }
          }
        }
      });

    });

    it('should allow read based on auth uid and provider', function() {
      expect(targaryen.users.password).canRead('users/password/password:500f6e96-92c6-4f60-ad5d-207253aee4d3');
    });

    it('should allow read based on 3 path segment names', function() {
      expect(targaryen.users.unauthenticated).canRead('first/second/third');
    });

  });

  describe('delete nodes', function() {
    beforeEach(function() {
      targaryen.setFirebaseData({
        test: {
          number: 42,
          bool: true
        },
        canDelete: 'test',
        otherCanDelete: 'test'
      });
      targaryen.setFirebaseRules({
        rules: {
          test: {
            '.write': 'true',
            '.read': 'true',
            '.validate': 'newData.hasChildren([\'number\', \'bool\'])',
            number: {
              '.validate': 'newData.isNumber()'
            },
            bool: {
              '.validate': 'newData.isBoolean()'
            }
          },
          canDelete: {
            '.read': 'true',
            '.write': 'true',
            '.validate': 'newData.isString()'
          },
          shouldValidate: {
            '.read': 'true',
            '.write': 'true',
            '.validate': 'newData.isBoolean()'
          },
          otherCanDelete: {
            '.read': 'true',
            '.write': 'true',
            '.validate': 'newData.isString()'
          }
        }
      });
    });

    it('should not be able to delete /test/number', function() {
      expect({uid: 'anyone'}).cannotWrite('test/number', null);
    });

    it('should be able to delete /test', function() {
      expect({uid: 'anyone'}).canWrite('test', null);
    });

    it('should be able to delete /canDelete', function() {
      expect({uid: 'anyone'}).canWrite('canDelete', null);
    });

    it('should not be able to delete part of /test in a multi-update', function() {
      expect({uid: 'anyone'}).cannotPatch('/', {
        'test/bool': null,
        canDelete: null
      });
    });

    it('should be able to delete as part of a multi-path write', function() {
      expect({uid: 'anyone'}).canPatch('/', {
        test: {
          bool: false,
          number: 5
        },
        canDelete: null
      });
    });

    it('should be able to delete a whole object by nulling all children', function() {
      expect({uid: 'anyone'}).canWrite('test', {
        bool: null,
        number: null
      });
    });

    it('should not be able to write invalid data by deleting a sibling', function() {
      expect({uid: 'anyone'}).cannotWrite('/', {
        canDelete: null,
        shouldValidate: 'not a boolean',
        otherCanDelete: null
      });
    });

  });
});
