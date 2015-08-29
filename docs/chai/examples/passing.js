
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

  it('can be tested against', function() {

    expect(users.unauthenticated).cannot.read.path('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3');
    expect(users.password).can.read.path('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3');

    expect(users.password).cannot.write(true)
    .to.path('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/innocent');

    expect({ uid: 'password:3403291b-fdc9-4995-9a54-9656241c835d' }).can.write(true)
    .to.path('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/on-fire');

  });

});

