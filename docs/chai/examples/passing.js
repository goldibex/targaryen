
var chai = require('chai'),
  targaryen = require('../../index.js'), // in your app this would be require('targaryen')
  expect = chai.expect,
  users = targaryen.users;

describe('A valid set of security rules and data', function() {

  before(function() {
    targaryen.setFirebaseData(require('./data.json'));
    targaryen.setFirebaseRules(require('./rules.json'));
  });

  it('can be tested against', function() {

    expect(users.unauthenticated).cannot.read('/users/simplelogin:1');
    expect(users.simplelogin).can.read('/users/simplelogin:1');

    expect(users.simplelogin).cannot.write(true)
    .to.path('/users/simplelogin:1/innocent');

    expect({ uid: 'simplelogin:2' }).can.write(true)
    .to.path('/users/simplelogin:1/on-fire');

  });

});

