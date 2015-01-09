
'use strict';

var chai = require('chai'),
  plugin = require('../../../lib/chai');

describe('Chai plugin', function() {

  before(function() {
    chai.use(plugin);
  });

  describe('if unconfigured', function() {

    it('throws an error for any test', function() {

      expect(function() {
        expect(null).can.read.path('/');
      }).to.throw();

    });

  });

  describe('#setFirebaseData', function() {

    it('sets the underlying Firebase database to the supplied data', function() {

      plugin.setFirebaseData({
        users: {
          'simplelogin:1': {
            name: 'Sherlock Holmes'
          },
          'simplelogin:2': {
            name: 'John Watson'
          }
        }
      });

    });

  });

  describe('#setFirebaseRules', function() {

    it('sets the underlying Firebase database to the supplied data', function() {

      plugin.setFirebaseRules({
        rules: {
          users: {
            '$user': {
              '.read': 'auth.uid === $user',
              '.write': 'auth.isSuper === true'
            }
          },
          posts: {
            '$post': {
              '.read': true,
              '.write': true,
              '.validate': 'newData.hasChildren(["created", "text", "author"]) && newData.child("author").val() === auth.uid'
            }
          }
        }
      });

    });

  });

  describe('when properly configured', function() {

    it('permits read tests', function() {
      expect(null).cannot.read.path('users/simplelogin:1');
      expect({ uid: 'simplelogin:1'}).can.read.path('users/simplelogin:1');
    });

    it('permits write tests', function() {

      expect({ uid: 'simplelogin:1'}).cannot.write({smart: true})
      .to.path('users/simplelogin:1');

      expect({ uid: 'simplelogin:1', isSuper: true }).can.write({stupid: true})
      .to.path('users/simplelogin:1');

      expect({ uid: 'simplelogin:1'}).cannot.write({
        author: 'simplelogin:2',
        created: Date.now(),
        text: 'Hello!'
      })
      .to.path('posts/newpost');

      expect({ uid: 'simplelogin:1' }).cannot.write({ author: 'simplelogin:1'})
      .to.path('posts/newpost');

      expect({ uid: 'simplelogin:1' }).can.write({
        author: 'simplelogin:1',
        created: Date.now(),
        text: 'Hello!'
      })
      .to.path('posts/newpost');

    });

  });

});
