/**
 * Register chai plugins and augment mocha global.
 *
 * Should be used with mocha's "require" flag to be imported before any mocha
 * test are loaded or run.
 *
 */

"use strict";

const chai = require("chai");
const sinon = require("sinon");
const sinonChai = require("sinon-chai");
const dirtyChai = require("dirty-chai");

chai.use(sinonChai);
chai.use(dirtyChai);

global.expect = chai.expect;
global.sinon = sinon;
