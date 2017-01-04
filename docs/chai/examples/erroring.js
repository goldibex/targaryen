'use strict';

// in your app this would be require('targaryen/plugins/chai')
const targaryen = require('../../../plugins/chai');
const chai = require('chai');
const path = require('path');
const rules = targaryen.json.loadSync(path.join(__dirname, 'bad-rules.json'));

chai.use(targaryen);

describe('An invalid set of security rules', function() {

  it('causes Targaryen to throw', function() {
    targaryen.setFirebaseData(require('./data.json'));
    targaryen.setFirebaseRules(rules);
  });

});

