
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
    expect(users.unauthenticated).can.read.path('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3');
  });

  it('can have write errors', function() {

    expect(users.password).can.write(true)
    .to.path('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/innocent');

  });

  it('can have validation errors', function() {

    expect({ uid: 'password:3403291b-fdc9-4995-9a54-9656241c835d' }).can.write(true)
    .to.path('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/innocent');

  });

});

