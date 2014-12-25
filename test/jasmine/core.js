
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
          'simplelogin:1': {
            name: 'Sherlock Holmes'
          },
          'simplelogin:2': {
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

      expect(targaryen.users.simplelogin).canRead('users/simplelogin:1');
      expect(targaryen.users.unauthenticated).canRead('posts/first');
      expect(targaryen.users.unauthenticated).cannotRead('users/simplelogin:1');

      expect(targaryen.users.simplelogin)
      .canWrite('users/simplelogin:1', { name: 'Sherlock Holmes, Ph.D'});
      expect(targaryen.users.simplelogin)
      .cannotWrite('posts/newpost', { author: 'simplelogin:2'});

    });

  });


});
