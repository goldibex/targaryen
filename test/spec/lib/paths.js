/**
 * Test path helper functions.
 */

"use strict";

const paths = require("../../../lib/paths.js");

describe("paths", function() {
  describe("join", function() {
    it("should merge path", function() {
      expect(paths.join("foo", "bar/baz")).to.equal("foo/bar/baz");
      expect(paths.join("foo", "")).to.equal("foo");
      expect(paths.join("", "bar/baz")).to.equal("bar/baz");
    });

    it("should trim root path", function() {
      expect(paths.join("/foo/", "bar/baz")).to.equal("foo/bar/baz");
    });

    it("should trim the beginning of the path", function() {
      expect(paths.join("foo", "/bar/baz")).to.equal("foo/bar/baz");
    });
  });

  describe("split", function() {
    it("should split the path", function() {
      expect(paths.split("foo/bar/baz")).to.eql(["foo", "bar", "baz"]);
    });

    it("should no split empty path", function() {
      expect(paths.split("")).to.eql([]);
    });

    it("should trim the beginning of the path", function() {
      expect(paths.split("/foo/bar/baz")).to.eql(["foo", "bar", "baz"]);
    });
  });
});
