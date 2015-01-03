
## Note

The CLI utility is meant for somewhat simpler tests. If you have more complex
requirements, please use targaryen as a plugin for either [Jasmine](https://github.com/goldibex/targaryen/blob/master/docs/jasmine) or [Chai](https://github.com/goldibex/targaryen/blob/master/docs/chai).

## Using Targaryen's standalone CLI

1. Run `npm install -g targaryen`.
2. Create a JSON security tests file. The file should contain a single base object
with the following 3 keys:

  `root`: an object containing the mock data the security tests should
  operate on. This data can either be formatted identically to the kind of value that
  comes out of `exportVal`, or just given as plain values if you don't care about priorities.
  Additionally, the special object `{ ".sv": "timestamp" }` will be replaced with
  an integer containing the number of milliseconds since the epoch.

    An example:
    ```json
      "root": {
        "crimes": {
          "6ca5": {
            "type": "theft of Mona Lisa",
            "foiled": true,
            "criminal": "criminals:1",
            "detective": "detectives:1"
          }
        }
      }
    ```
  
    `users`: an object that describes the authentication state of any kind of user
    that might access your system. The keys should be the names by which you want to refer
    to the auth payload in the tests; the values should be the auth payloads themselves.
    
    For example:
    ```json
      "users": {
        "Sherlock Holmes": { "uid": "detectives:1", "smart": true },
        "John Watson": { "uid": "detectives:2", "smart": false },
        "James Moriarity": { "uid": "criminals:1", "smart": true }
      }
    ```

    `tests`: an object that describes the tests, that is, operations that should or
    should not be possible given the current data in `root`, one of the users from `users`,
    and possibly some new data to be written.
  
    The keys of this object should be the paths to be tested. The values are objects with at least
    one of four keys, `canRead`, `canWrite`, `cannotRead`, and `cannotWrite`. The values associated
    with these four keys should be arrays containing strings, in the case of the read
    operations; or, for the write operations, objects with keys `auth` and `data`, where `auth`
    is the name of the auth object and `data` is the proposed new data for the location, following
    the format specified for `root` above.

    For example:
    ```json
      "tests": {
        "crimes/some-uncommitted-crime": {
          "canRead": ["Sherlock Holmes", "John Watson"],
          "canWrite": ["James Moriarty"]
        },
        "crimes/6ca5/foiled": {
          "canWrite": [
            { "auth": "Sherlock Holmes", "data": true }
          ],
          "cannotWrite": [
            { "auth": "James Moriarty", "data": false }
          ]
        }
      }
    ```

3. Run the tests with the command

  ```bash
  $ targaryen path/to/rules.json path/to/tests.json
  ```

Targaryen will run the tests and report any failures on stderr.

If you specify `--verbose`, Targaryen will pretty-print a nicely formatted table
containing a list of the tests and their status.

If you specify `--debug', Targaryen will print the full debug output for each test,
indicating which rules were tested and what their outcomes were. This is the same
as the output of the Firebase Forge's simulator.

Targaryen exits with a non-zero status code if at least one test failed, or zero if
all tests succeeded.

