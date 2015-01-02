
targaryen
=========

Completely and thoroughly test your Firebase security rules without connecting to Firebase.

## Usage

All you need to do is supply the security rules and some mock data, then write tests describing the expected behavior of the rules. Targaryen will interpret the rules and run the tests.
 
Targaryen can be used in one of three ways: as a standalone command-line utility, as a set of custom matchers for [Jasmine](https://jasmine.github.io), or as a plugin for [Chai](http://chaijs.com). When a test fails, you get detailed debug information that explains why the read/write operation succeeded/failed.


See [USAGE.md](https://github.com/goldibex/targaryen/blob/master/USAGE.md) for more information.

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
