## 2.3.0 (upcoming)

- [Expose Ruleset, DataSnapshot and helpers](https://github.com/goldibex/targaryen/pull/50); thanks to @mhuebert.
- [Write operations now replace nodes instead of merging them](https://github.com/goldibex/targaryen/pull/52).
- [Fix initial timestamps](https://github.com/goldibex/targaryen/pull/41); The timestamp used to replace a timestamp server value will now match the `now` variable in rule tests.
- `setFirebaseData` gains a `now parameter: `targaryen.setFirebaseData(data[, now]);`.
- jasmine matchers gain an optional now parameter.
- chai plugin `write` and `patch` methods gain an optional now parameter.
- chai plugin gains a `readAt(now)` method.

## 2.2.1 (upcoming)

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
