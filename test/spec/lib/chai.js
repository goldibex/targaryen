
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
          'password:500f6e96-92c6-4f60-ad5d-207253aee4d3': {
            name: 'Sherlock Holmes'
          },
          'password:3403291b-fdc9-4995-9a54-9656241c835d': {
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
              '.validate': 'newData.hasChildren(["created", "text", "author"]) && newData.child("author").val() === auth.uid',
              created: {
                '.validate': 'data.exists() == false'
              },
              author: {
                '.validate': 'data.exists() == false'
              }
            }
          }
        }
      });

    });

  });

  describe('when properly configured', function() {
    var now;

    beforeEach(function() {

      plugin.setFirebaseData({
        users: {
          'password:500f6e96-92c6-4f60-ad5d-207253aee4d3': {
            name: 'Sherlock Holmes'
          },
          'password:3403291b-fdc9-4995-9a54-9656241c835d': {
            name: 'John Watson'
          }
        }
      });

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
              '.validate': 'newData.hasChildren(["created", "text", "author"]) && newData.child("author").val() === auth.uid',
              created: {
                '.validate': 'data.exists() == false'
              },
              author: {
                '.validate': 'data.exists() == false'
              }
            }
          }
        }
      });
    });

    it('permits read tests', function() {
      expect(null).cannot.read.path('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3');
      expect({ uid: 'password:500f6e96-92c6-4f60-ad5d-207253aee4d3'}).can.read.path('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3');
    });

    it('permits write tests', function() {

      expect({ uid: 'password:500f6e96-92c6-4f60-ad5d-207253aee4d3'}).cannot.write({smart: true})
      .to.path('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3');

      expect({ uid: 'password:500f6e96-92c6-4f60-ad5d-207253aee4d3', isSuper: true }).can.write({stupid: true})
      .to.path('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3');

      expect({ uid: 'password:500f6e96-92c6-4f60-ad5d-207253aee4d3'}).cannot.write({
        author: 'password:3403291b-fdc9-4995-9a54-9656241c835d',
        created: Date.now(),
        text: 'Hello!'
      })
      .to.path('posts/newpost');

      expect({ uid: 'password:500f6e96-92c6-4f60-ad5d-207253aee4d3' }).cannot.write({
        author: 'password:500f6e96-92c6-4f60-ad5d-207253aee4d3'
      })
      .to.path('posts/newpost');

      expect({ uid: 'password:500f6e96-92c6-4f60-ad5d-207253aee4d3' }).can.write({
        author: 'password:500f6e96-92c6-4f60-ad5d-207253aee4d3',
        created: Date.now(),
        text: 'Hello!'
      })
      .to.path('posts/newpost');

    });

    it('should permit patch tests', function() {
      plugin.setFirebaseData({
        users: {
          'password:500f6e96-92c6-4f60-ad5d-207253aee4d3': {
            name: 'Sherlock Holmes'
          },
          'password:3403291b-fdc9-4995-9a54-9656241c835d': {
            name: 'John Watson'
          }
        },
        posts: {
          somePost: {
            author: 'password:500f6e96-92c6-4f60-ad5d-207253aee4d3',
            created: Date.now(),
            text: 'Hello!'
          }
        }
      });

      expect({ uid: 'password:500f6e96-92c6-4f60-ad5d-207253aee4d3' }).can.patch({
        text: 'Hello World!'
      })
      .to.path('posts/somePost');

      expect({ uid: 'password:500f6e96-92c6-4f60-ad5d-207253aee4d3' }).cannot.patch({
        text: 'Hello World!',
        created: Date.now()
      })
      .to.path('posts/somePost');

    });

  });

});
