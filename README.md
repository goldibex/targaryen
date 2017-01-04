
targaryen
=========

[![Build Status](https://travis-ci.org/goldibex/targaryen.svg)](https://travis-ci.org/goldibex/targaryen)

Completely and thoroughly test your Firebase security rules without connecting to Firebase.

## Usage

All you need to do is supply the security rules and some mock data, then write tests describing the expected behavior of the rules. Targaryen will interpret the rules and run the tests.

```js
const assert = require('assert');
const targaryen = require('targaryen');

const rules = {
  rules: {
    foo: {
      '.write': 'true'
    }
  }
};
const data = {foo: 1};
const auth = {uid: 'someuid'};

const database = targaryen.database(rules, data).as(auth).with({debug: true});
const {allowed, newDatabase, info} = database.write('/foo', 2);

console.log('Rule evaluations:\n', info);
assert.ok(allowed);

assert.equal(newDatabase.rules, database.rules);
assert.equal(newDatabase.root.foo.$value(), 2);
assert.equal(newDatabase.auth, auth);
```

Targaryen provides three convenient ways to run tests:

- as a standalone command-line utility:

    ```bash
    targaryen path/to/rules.json path/to/tests.json
    ```

- as a set of custom matchers for [Jasmine](https://jasmine.github.io):

    ```js
    const targaryen = require('targaryen/plugins/jasmine');
    const rules = targaryen.json.loadSync(RULES_PATH);

    describe('my security rules', function() {

      beforeEach(function() {
        jasmine.addMatchers(targaryen.matchers);
        targaryen.setFirebaseData(require(DATA_PATH));
        targaryen.setFirebaseRules(rules);
      });

      it('should allow authenticated user to read all data', function() {
        expect({uid: 'foo'}).canRead('/');
        expect(null).cannotRead('/');
      })

    });
    ```

- or as a plugin for [Chai](http://chaijs.com).

    ```js
    const chai = require('chai');
    const targaryen = require('targaryen/plugins/chai');
    const expect = chai.expect;
    const rules = targaryen.json.loadSync(RULES_PATH);

    chai.use(targaryen);

    describe('my security rules', function() {

      before(function() {
        targaryen.setFirebaseData(require(DATA_PATH)));
        targaryen.setFirebaseRules(rules);
      });

      it('should allow authenticated user to read all data', function() {
        expect({uid: 'foo'}).can.read.path('/');
        expect(null).cannot.read.path('/');
      })

    });
    ```

When a test fails, you get detailed debug information that explains why the read/write operation succeeded/failed.

See [USAGE.md](https://github.com/goldibex/targaryen/blob/master/USAGE.md) for more information.


## How does Targaryen work?

Targaryen statically analyzes your security rules using [esprima](http://esprima.org). It then conducts two passes over the abstract syntax tree. The first pass, during the parsing process, checks the types of variables and the syntax of the rules for correctness. The second pass, during the testing process, evaluates the expressions in the security rules given a set of state variables (the RuleDataSnapshots, auth data, the present time, and any wildchildren).


## Install

```shell
npm install targaryen@3
```


## API

- `targaryen.database(rules: object|Ruleset, data: object|DataNode, now: null|number): Database`

    Creates a set of rules and initial data to simulate read, write and update of operations.

    The Database objects are immutable; to get an updated Database object with different the user auth data, rules, data or timestamp, use its `with(options)` method.

- `Database.prototype.with({rules: {rules: object}, data: any, auth: null|object, now: number, debug: boolean}): Database`

    Extends the database object with new rules, data, auth data, or time stamp.

- `Database.prototype.as(auth: null|object): Database`

    Extends the database object with auth data.

- `Database.prototype.read(path: string, now: null|number): Result`

    Simulates a read operation.

- `Database.prototype.write(path: string, value: any, priority: any, now: null|number): Result`

    Simulates a write operation.

- `Database.prototype.update(path: string, patch: object, now: null|number): Result`

    Simulates an update operation (including multi-location update).

- `Result: {path: string, auth: any, allowed: boolean, info: string, database: Database, newDatabase: Database, newValue: any}`

    It holds:

    - `path`: operation path;
    - `auth`: operation authentication data;
    - `type`: operation authentication type (read|write|patch);
    - `allowed`: success status;
    - `info`: rule evaluation info;
    - `database`: original database.

    For write and update operations, it also includes:

    - `newDatabase`: the resulting database;
    - `newValue`: the value written to the database.

- `targaryen.store(data: object|DataNode, options: {now: number|null, path: string|null, priority: string|number|null}): DataNode`

    Can be used to create the database root ahead of time and check its validity.

    The `path` option defines the relative path of the data from the root; e.g. `targaryen.store(1, {path: 'foo/bar/baz'})` is equivalent to `targaryen.store({foo: {bar: {baz: 1}}})`.

- `targaryen.store(rules: object|Ruleset): Ruleset`

    Can be used to create the database rule set ahead of time and check its validity.

- `targaryen.util`

    Set of helper functions used by the `jasmine` and `chai` plugins reference implementations.


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
