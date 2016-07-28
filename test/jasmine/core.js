
'use strict';

var targaryen = require('../../index');

describe('the targaryen Jasmine plugin', function() {

  beforeEach(function() {
    jasmine.addMatchers(targaryen.jasmine.matchers);
  });

  describe('if not configured correctly', function() {

    it('errors on any expectation', function() {

      expect(function() {
        expect(null).canRead('foo');
      }).toThrow();

      expect(function() {
        expect(null).cannotRead('foo');
      }).toThrow();

      expect(function() {
        expect(null).canWrite('foo', 7);
      }).toThrow();

      expect(function() {
        expect(null).cannotWrite('foo', 7);
      }).toThrow();

    });

  });

  describe('if configured correctly', function() {

    beforeEach(function() {

      targaryen.setFirebaseData({
        users: {
          'password:500f6e96-92c6-4f60-ad5d-207253aee4d3': {
            name: 'Sherlock Holmes'
          },
          'password:3403291b-fdc9-4995-9a54-9656241c835d': {
            name: 'John Watson'
          },

        }
      });

      targaryen.setFirebaseRules({
        rules: {
          users: {
            $user: {
              '.read': 'auth !== null',
              '.write': 'auth.uid === $user'
            }
          },
          posts: {
            $post: {
              '.read': true,
              '.write': 'newData.child("author").val() == auth.uid'
            }
          }
        }
      });

    });

    it('runs tests against the provided data and rules', function() {

      expect(targaryen.users.password).canRead('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3');
      expect(targaryen.users.unauthenticated).canRead('posts/first');
      expect(targaryen.users.unauthenticated).cannotRead('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3');

      expect(targaryen.users.password)
      .canWrite('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3', { name: 'Sherlock Holmes, Ph.D'});
      expect(targaryen.users.password)
      .cannotWrite('posts/newpost', { author: 'password:3403291b-fdc9-4995-9a54-9656241c835d'});

    });

  });

  describe("deep write", function(){
    beforeEach(function(){
      targaryen.setFirebaseData(
        { flats: { "221bbakerst": { landlady: 'Mrs Hudson' }  } }
      )
        targaryen.setFirebaseRules({
          "rules": {
            "flats": {
              "$cid": {
                ".validate": "newData.hasChildren(['landlady'])",
                ".write": "true",
                ".read": "true"
              }
            }
          }
        })
    })  
    it("should not check parent validations", function(){
      expect({uid:'holmes'}).canWrite('/flats/221bbakerst/tenants/Holmes',{})
    });
  });
  xdescribe('using nested variables in path', function() {

    beforeEach(function() {
      // using double quotes to make the data & rules compatible with Firebase (web interface)

      targaryen.setFirebaseData({
        "users": {
          "password": {
            "password:500f6e96-92c6-4f60-ad5d-207253aee4d3": {
              "name": "Sherlock Holmes"
            },
            "password:3403291b-fdc9-4995-9a54-9656241c835d": {
              "name": "John Watson"
            },
          },
        },
        "first": {
          "second": {
            "third": {
              "any": "value"
            }
          }
        }
      });

      targaryen.setFirebaseRules({
        "rules": {
          "users": {
            "$provider": {
              "$user": {
                // all data is personal (read and write)
                ".read": "auth !== null && auth.uid === $user && auth.provider === $provider",
                ".write": "auth !== null && auth.uid === $user && auth.provider === $provider",
              }
            }
          },
          "posts": {
            "$post": {
              ".read": true,
              ".write": "newData.child('author').val() == auth.uid"
            }
          },
          "$one": {
            "$two": {
              "$three": {
                ".read": "$one == 'first' && $two == 'second' && $three == 'third'"
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

  describe("delete nodes", function(){
    beforeEach(function(){
      targaryen.setFirebaseData({
        "test": {
          "number": 42,
          "bool": true
        },
        "canDelete": "test"
      });
      targaryen.setFirebaseRules({
        "rules": {
          "test": {
            ".write": "true",
            ".read": "true",
            ".validate": "newData.hasChildren(['number', 'bool'])",
            "number": {
              ".validate": "newData.isNumber()"
            },
            "bool": {
              ".validate": "newData.isBoolean()"
            }
          },
          "canDelete": {
            ".read": "true",
            ".write": "true",
            ".validate": "newData.isString()"
          }
        }
      });
    });

    it("should not be able to delete /test/number", function(){
      expect({uid:'anyone'}).cannotWrite('test/number', null);
    });

    it("should be able to delete /test", function(){
      expect({uid:'anyone'}).canWrite('test', null);
    });

    it("should be able to delete /canDelete", function(){
      expect({uid:'anyone'}).canWrite('canDelete', null);
    });

    it("should not be able to delete part of /test in a multi-update", function () {
      expect({uid:'anyone'}).cannotWrite('/', {
        "test": {
          "bool": null
        },
        "canDelete": null
      });
    });

    it("should be able to delete as part of a multi-path write", function () {
      expect({uid:'anyone'}).canWrite('/', {
        "test": {
          "bool": false,
          "number": 5
        },
        "canDelete": null
      });
    });

    it("should be able to delete a whole object by nulling all children", function () {
      expect({uid:'anyone'}).canWrite('test', {
          "bool": null,
          "number": null
      });

      pending("This doesn't work in the tests, but this works at least in the Javascrip SDK");
    })
  });
});
