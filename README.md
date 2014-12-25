targaryen
=========

Completely and thoroughly test your Firebase security rules without connecting to Firebase.

## Usage

 All you need to do is supply the security rules and some mock data, then write tests describing the expected behavior of the rules. Targaryen will interpret the rules and run the tests.
 
Targaryen provides custom matchers for Jasmine and a plugin for Chai. When a test fails, you get detailed debug information that explains why the read/write operation succeeded/failed.

Start off with `npm install --save-dev targaryen`, then run the setup methods.

`targaryen.setFirebaseData(data)`: set the database state for the test. `data` is a plain old Javascript object containing whatever data you want to be accessible via the `root` and `data` objects in the security rules. You can either use the data format of Firebase's `exportVal` (i.e., with ".value" and ".priority" keys) or just a plain Javascript object. The plain object will be converted to the Firebase format. 

`targaryen.setFirebaseRules(rules)`: set the database rules for the test. `rules` is a plain old Javascript object with the contents `rules.json`, so you can just say `targaryen.setFirebaseRules(require('./rules.json'))` and be on your way.

### Chai

Docs are at [docs/chai](https://github.com/goldibex/targaryen/blob/master/docs/chai). A quick example:

```js

var chai = require('chai'),
  expect = chai.expect,
  targaryen = require('targaryen');

chai.use(targaryen.chai);

describe('A set of rules and data', function() {

  before(function() {
    
    // when you call setFirebaseData, you can either use the data format
    // of `exportVal` (i.e., with ".value" and ".priority" keys) or just a plain
    // Javascript object. The plain object will be converted to the Firebase format.

    targaryen.setFirebaseData({
      users: {
        'simplelogin:1': {
          name: {
            '.value': 'Rickard Stark',
            '.priority': 2
          }
        },
        'simplelogin:2': {
          name: 'Mad Aerys',
          king: true
        }
      }
    });

    // any logged-in user can read a user object, but only the king can write them!
    targaryen.setFirebaseRules({
      rules: {
        users: {
          '.read': 'auth !== null',
          '.write': 'root.child('users').child(auth.uid).child('king').val() === true'
        }
      }
    });

  });

  it('can be tested', function() {

    expect(targaryenChai.users.unauthenticated)
    .cannot.read.path('users/simplelogin:1');

    expect(targaryenChai.users.simplelogin)
    .can.read.path('users/simplelogin:1');

    expect(targaryenChai.users.simplelogin)
    .cannot.write(true).to.path('users/simplelogin:1/innocent');

    expect({ uid: 'simplelogin:2' })
    .can.write(true).to.path('users/simplelogin:2/on-fire');

  });

});

```

### Jasmine

Docs are at [docs/jasmine](https://github.com/goldibex/targaryen/blob/master/docs/jasmine). A quick example:

```js
  
var targaryen = require('targaryen');

// see Chai example above for format
targaryen.setFirebaseData(...);
targaryen.setFirebaseRules(...);


describe('A set of rules and data', function() {

  beforeEach(function() {
    jasmine.addMatchers(targaryen.jasmine.matchers);    
  });

  it('can be tested', function() {

    expect(targaryen.users.unauthenticated)
    .cannotRead('users/simplelogin:1');

    expect(targaryen.users.simplelogin)
    .canRead('users/simplelogin:1');

    expect(targaryen.users.simplelogin)
    .cannotWrite('users/simplelogin:1/innocent', true);

    expect({ uid: 'simplelogin:2'})
    .canWrite('users/simplelogin:1/onFire', true);

  });

});

```

## How does Targaryen work?

Targaryen statically analyzes your security rules using [esprima](http://esprima.org). It then conducts two passes over the abstract syntax tree. The first pass, during the parsing process, checks the types of variables and the syntax of the rules for correctness. The second pass, during the testing process, evaluates the expressions in the security rules given a set of state variables (the RuleDataSnapshots, auth data, the present time, and any wildchildren).

## Why is it named Targaryen?

> There were trials. Of a sort. Lord Rickard demanded trial by combat, and the
> king granted the request. Stark armored himself as for battle, thinking to
> duel one of the Kingsguard. Me, perhaps. Instead they took him to the throne
> room and suspended him from the rafters while two of Aerys's pyromancers
> kindled a flame beneath him. The king told him that *fire* was the champion
> of House Targaryen. So all Lord Rickard needed to do to prove himself
> innocent of treason was... well, not burn.

George R.R. Martin, *A Clash of Kings,* chapter 55, New York: Bantam Spectra, 1999.

## License

[ISC](https://github.com/goldibex/targaryen/blob/master/LICENSE).
