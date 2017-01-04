'use strict';

// in your app this would be require('targaryen/plugins/jasmine')
const targaryen = require('../../../../../plugins/jasmine');
const path = require('path');

const rules = targaryen.json.loadSync(path.join(__dirname, 'bad-rules.json'));

describe('An invalid set of security rules and data', function() {

  beforeEach(function() {
    jasmine.addMatchers(targaryen.matchers);
  });

  it('causes Targaryen to throw', function() {

    targaryen.setFirebaseData(require('./data.json'));
    targaryen.setFirebaseRules(rules);

  });

});

