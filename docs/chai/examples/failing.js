
var chai = require('chai'),
  targaryen = require('../../../index.js'), // in your app this would be require('targaryen')
  expect = chai.expect,
  users = targaryen.users;

chai.use(targaryen.chai);

describe('A valid set of security rules and data', function() {

  before(function() {
    targaryen.setFirebaseData(require('./data.json'));
    targaryen.setFirebaseRules(require('./rules.json'));
  });

  it('can have read errors', function() {
    expect(users.unauthenticated).can.read.path('users/simplelogin:1');
  });

  it('can have write errors', function() {

    expect(users.simplelogin).can.write(true)
    .to.path('users/simplelogin:1/innocent');

  });

  it('can have validation errors', function() {

    expect({ uid: 'simplelogin:2' }).can.write(true)
    .to.path('users/simplelogin:1/innocent');

  });

});

