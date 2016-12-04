## 3.0.0 (upcoming)

- [Fix type inferring](https://github.com/goldibex/targaryen/pull/64).
- [Fix write permission test](https://github.com/goldibex/targaryen/issues/73).
- [Add a verbose mode displaying detailed evaluation info](https://github.com/goldibex/targaryen/pull/83).
- [Refactor API](https://github.com/goldibex/targaryen/pull/80):

    Plugins scripts should be imported directly, e.g. `require('targaryen/plugins/chai')`:

    * Add `targaryen/plugins/chai`.
    * Add `targaryen/plugins/jasmine`.
    * Deprecate `targaryen.chai`.
    * Deprecate `targaryen.jasmine`.
    * Deprecate `targaryen.setFirebaseData`.
    * Deprecate `targaryen.setFirebaseRules`.
    * Deprecate `targaryen.setDebug`.
    * Deprecate `targaryen.users`.

    Simpler API to use targaryen directly:

    * Add `targaryen.database(rules: object|Ruleset, data: object|DataNode, now: null|number): Database`.
    * Add `targaryen.util` functions used by the CLI and the reference plugins for chai and jasmin
    * Remove `targaryen.Ruleset`.
    * Remove `targaryen.DataSnapshot`.
    * Remove `targaryen.helpers`.


Thanks goes to @mhuebert, @RomansBermans and @simenbrekken for their contributions.

## 2.3.3 (2016-12-04)

- [Fix write/patch debug message](https://github.com/goldibex/targaryen/pull/93).

Thanks to @RomansBermans for reporting the issue.

## 2.3.2 (2016-11-18)

- [Fix runtime handling of null value](https://github.com/goldibex/targaryen/issues/86).

Thanks to @RomansBermans and @simenbrekken for spotting the issue.

## 2.3.1 (2016-11-08)

- Fix npm description

## 2.3.0 (2016-11-01)

- [Expose Ruleset, DataSnapshot and helpers](https://github.com/goldibex/targaryen/pull/50).
- [Write operations now replace nodes instead of merging them](https://github.com/goldibex/targaryen/pull/52).
- [Fix initial timestamps](https://github.com/goldibex/targaryen/pull/41); The timestamp used to replace a server value will match the `now` variable in rule tests.
- [Fix parsing rules with unknown identifers](https://github.com/goldibex/targaryen/pull/55).
- [Fix `Ruleset#tryWrite` returning `data` and `newData` as a value instead of a snapshot](https://github.com/goldibex/targaryen/pull/59).
- [Fix inconsistence between Ruleset's `tryRead`, `tryWrite`, and `tryPatch` returned result](https://github.com/goldibex/targaryen/pull/59): they now all return a root and data snapshot, and a newRoot and newData snapshot when appropriate.
- [Prune off null value and empty node after any update](https://github.com/goldibex/targaryen/pull/56).
- [Partially fix type inference while building the rules](https://github.com/goldibex/targaryen/pull/57).
- [Fix missing auth properties evaluation](https://github.com/goldibex/targaryen/issues/60).
- [Fix evaluation error handling in write/patch operations](https://github.com/goldibex/targaryen/issues/61).
- [Fix evaluation of computed member expression](https://github.com/goldibex/targaryen/issues/75).
- `setFirebaseData` gains a `now` parameter: `targaryen.setFirebaseData(data[, now]);`.
- jasmine matchers gain an optional `now` parameter.
- chai plugin `write` and `patch` methods gain an optional `now` parameter.
- chai plugin gains a `readAt(now)` method.

Thanks goes to @georgesboris and @mhuebert for their contributions.

## 2.2.1 (2016-10-21)

- [Properly merge literal value nodes (including null)](https://github.com/goldibex/targaryen/pull/44);
  a node would have been set to null but it's - deleted - children would still have been validated with their old value.
- [Skipping validation of node set to null would skip validation of sibling nodes; this is now fixed](https://github.com/goldibex/targaryen/pull/48).
- [Treat empty objects as null](https://github.com/goldibex/targaryen/pull/51). Thanks to @mhuebert.

## 2.2.0 (2016-08-12)

Starting from this release, Node.js version 0.12 is no longer supported. Please use 2.1 for Node versions 0.12 and below.

- [Wildcards are now correctly propagated at multiple levels](https://github.com/goldibex/targaryen/pull/39). Thanks to @dinoboff.
- [Support for testing update operations, including multi-location updates](https://github.com/goldibex/targaryen/pull/37). Thanks to @dinoboff.
- [.validate rules are now ignored during delete operations, reflecting the actual behavior of Firebase](https://github.com/goldibex/targaryen/pull/36). Thanks to @matijse. Fun fact: "ij" is a single letter in Dutch.
- ["JSON comments" in rules files are now correctly ignored, reflecting the actual behavior of Firebase](https://github.com/goldibex/targaryen/pull/32). Thanks to @sebastianovide.
- [The .priority key was inadvertently overwritten under some conditions; this is now fixed.](https://github.com/goldibex/targaryen/pull/35). Thanks to @matijse.

## 2.1.1 (2016-05-11)

- [You can now use unauthenticated users in CLI testing](https://github.com/goldibex/targaryen/pull/28). Thanks to @jbearer.

## 2.1.0 (2016-05-04)

- [newData is now correctly merged with existing root state](https://github.com/goldibex/targaryen/pull/27). Fixes [a bug demonstrated](https://github.com/goldibex/targaryen/pull/25) by @bijoutrouvaille. Thanks to @ibash for fixing it.

## 2.0.1 (2016-03-23)

- [Nested variables in rules](https://github.com/goldibex/targaryen/pull/23). Thanks to @petrusek.
- [Fix validate rules running on null](https://github.com/goldibex/targaryen/pull/21). Thanks to @jtwebman.

## 2.0.0 (2015-10-23)

- Major version bump that _should_ have happened in association with #14.
Sorry about that.
- Fixed a bug in parsing binary expressions (#18). Thanks to @CurtisHumphrey.

## 1.1.7 (2015-10-21)

- You can now use leading `/` in tests. Thanks to @CurtisHumphrey for this.
