'use strict';

const regexp = require('../../../../lib/parser/regexp/index');

describe('regexp', function() {

  [{
    title: 'basic expression',
    expression: {
      type: 'concatenation',
      value: 'abc',
      offset: 0,
      concatenation: [{
        type: 'char',
        value: 'a',
        offset: 0
      }, {
        type: 'char',
        value: 'b',
        offset: 1
      }, {
        type: 'char',
        value: 'c',
        offset: 2
      }]
    }
  }, {
    title: 'start anchor',
    expression: {
      type: 'concatenation',
      value: '^a',
      offset: 0,
      concatenation: [{
        type: 'startAnchor',
        value: '^',
        offset: 0
      }, {
        type: 'char',
        value: 'a',
        offset: 1
      }]
    }
  }, {
    title: 'end anchor',
    expression: {
      type: 'concatenation',
      value: 'a$',
      offset: 0,
      concatenation: [{
        type: 'char',
        value: 'a',
        offset: 0
      }, {
        type: 'endAnchor',
        value: '$',
        offset: 1
      }]
    }
  }, {
    title: 'union',
    expression: {
      type: 'union',
      value: 'a|b|(c|d)',
      offset: 0,
      branches: [{
        type: 'char',
        value: 'a',
        offset: 0
      }, {
        type: 'char',
        value: 'b',
        offset: 2
      }, {
        type: 'group',
        value: '(c|d)',
        offset: 4,
        group: {
          type: 'union',
          value: 'c|d',
          offset: 5,
          branches: [{
            type: 'char',
            value: 'c',
            offset: 5
          }, {
            type: 'char',
            value: 'd',
            offset: 7
          }]
        }
      }]
    }
  }, {
    title: 'a series',
    expression: {
      type: 'concatenation',
      value: 'a+b',
      offset: 0,
      concatenation: [{
        type: 'series',
        value: 'a+',
        offset: 0,
        pattern: {
          type: 'char',
          value: 'a',
          offset: 0
        },
        repeat: {
          type: 'repeat',
          value: '+',
          offset: 1,
          min: 1,
          max: Infinity
        }
      }, {
        type: 'char',
        value: 'b',
        offset: 2
      }]
    }
  }, {
    title: 'number',
    expression: {
      value: '10+|111',
      offset: 0,
      type: 'union',
      branches: [{
        value: '10+',
        offset: 0,
        type: 'concatenation',
        concatenation: [{
          type: 'number',
          value: '1',
          offset: 0
        }, {
          type: 'series',
          value: '0+',
          offset: 1,
          pattern: {
            type: 'char',
            value: '0',
            offset: 1
          },
          repeat: {
            type: 'repeat',
            value: '+',
            offset: 2,
            min: 1,
            max: Infinity
          }
        }]
      }, {
        value: '111',
        offset: 4,
        type: 'number'
      }]
    }
  }, {
    title: 'groups',
    expression: {
      type: 'group',
      value: '(ab(c)+)',
      offset: 0,
      group: {
        type: 'concatenation',
        value: 'ab(c)+',
        offset: 1,
        concatenation: [{
          type: 'char',
          value: 'a',
          offset: 1
        }, {
          type: 'char',
          value: 'b',
          offset: 2
        }, {
          type: 'series',
          value: '(c)+',
          offset: 3,
          pattern: {
            type: 'group',
            offset: 3,
            value: '(c)',
            group: {
              type: 'char',
              value: 'c',
              offset: 4
            }
          },
          repeat: {
            type: 'repeat',
            offset: 6,
            value: '+',
            min: 1,
            max: Infinity
          }
        }]
      }
    }
  }, {
    title: 'set',
    expression: {
      type: 'series',
      value: '[-a-z?]*',
      offset: 0,
      repeat: {
        type: 'repeat',
        min: 0,
        max: Infinity,
        offset: 7,
        value: '*'
      },
      pattern: {
        type: 'set',
        value: '[-a-z?]',
        offset: 0,
        exclude: null,
        include: [{
          type: 'char',
          value: '-',
          offset: 1
        }, {
          type: 'range',
          value: 'a-z',
          offset: 2,
          start: {
            type: 'char',
            value: 'a',
            offset: 2
          },
          end: {
            type: 'char',
            value: 'z',
            offset: 4
          }
        }, {
          type: 'char',
          value: '?',
          offset: 5
        }]
      }
    }
  }, {
    title: 'literal closing brace',
    expression: {
      type: 'char',
      value: '}',
      offset: 0
    }
  }].forEach(function(test) {
    it(`should parse ${test.title}`, function() {
      const results = regexp.parse(test.expression.value);

      expect(results).to.have.length(1);
      expect(results[0]).to.eql(test.expression);
    });
  });

  [{
    title: 'basic regexp',
    source: 'abc',
    expected: 'abc'
  }, {
    title: 'escaped characters',
    source: '\\(abc\\)',
    expected: '\\(abc\\)'
  }, {
    title: 'charset',
    source: '\\wbc',
    expected: '\\wbc'
  }, {
    title: 'dot',
    source: '.bc',
    expected: '.bc'
  }, {
    title: 'positive set',
    source: '[-a-z]bc',
    expected: '[-a-z]bc'
  }, {
    title: 'negative set',
    source: '[^\\W]bc',
    expected: '[^\\W]bc'
  }, {
    title: 'plus',
    source: 'a+b{1,}',
    expected: 'a+b+'
  }, {
    title: 'start',
    source: 'a*b{0,}',
    expected: 'a*b*'
  }, {
    title: 'mark',
    source: 'a?b{0,1}',
    expected: 'a?b?'
  }, {
    title: 'quantifier',
    source: 'a{2}b{2,}c{2,10}',
    expected: 'a{2}b{2,}c{2,10}'
  }, {
    title: 'group',
    source: '(foo)+',
    expected: '(foo)+'
  }, {
    title: 'union',
    source: '(a|b|c)',
    expected: '(a|b|c)'
  }, {
    title: 'anchors',
    source: '^abc$',
    expected: '^abc$'
  }, {
    title: 'ambiguous group',
    source: '(?:foo)',
    expected: '(\\?:foo)'
  }, {
    title: 'set',
    source: '[----z\\]]',
    expected: '[----z\\]]'
  }, {
    title: 'number',
    source: 'foo{2,100}|123',
    expected: 'foo{2,100}|123'
  }].forEach(function(test) {
    it(`should convert ${test.title}`, function() {
      const re = regexp.from(test.source);

      expect(re.source).to.equal(test.expected);
    });
  });
});
