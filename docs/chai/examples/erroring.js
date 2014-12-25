
var chai = require('chai'),
  targaryen = require('../../../index.js'), // in your app this would be require('targaryen')
  expect = chai.expect,
  users = targaryen.users;

chai.use(targaryen.chai);

describe('An invalid set of security rules', function() {

  it('causes Targaryen to throw', function() {
    targaryen.setFirebaseData(require('./data.json'));
    targaryen.setFirebaseRules(require('./bad-rules.json'));
  });

});

