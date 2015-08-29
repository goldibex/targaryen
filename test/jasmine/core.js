
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


});
