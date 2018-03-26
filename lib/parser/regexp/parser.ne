@{%
const moo = require('moo');
const token = require('./token')
const lexer = moo.states({
  main: {
    bar: '|',
    caret: '^',
    comma: ',',
    dollar: '$',
    dot: '.',
    closingParenthesis: ')',
    openingParenthesis: '(',
    mark: '?',
    plus: '+',
    closingBrace: '}',
    openingBrace: '{',
    star: '*',
    negativeSetStart: {match: '[^', push: 'set'},
    positiveSetStart: {match: '[', push: 'set'},

    charset: ['\\s', '\\w', '\\d', '\\S', '\\W', '\\D'],
    literal: /\\./,
    number: /0|[1-9][0-9]*/,
    char: /./
  },
  set: {
    setEnd: {match: ']', pop: true},
    charset: ['\\s', '\\w', '\\d', '\\S', '\\W', '\\D'],
    range: /(?:\\.|[^\]])-(?:\\.|[^\]])/,
    literal: /\\./,
    char: /./
  }
});

%}

@lexer lexer

# End and begin anchor ("^"" and "$"") are only allowed at the end of the
# expression.
root ->
    startRE:? RE endRE:? {% token.concatenation %}

# Special characters at the start the expression do not need to be escape.
startRE ->
    %caret            {% token.rename('startAnchor') %}
  | positionalLiteral {% id %}

#
endRE ->
    %dollar {% token.rename('endAnchor') %}

RE ->
    union    {% id %}
  | simpleRE {% id %}

union ->
    RE %bar simpleRE {% token.union %}

simpleRE ->
    concatenation {% id %}
  | basicRE       {% id %}

concatenation ->
    simpleRE basicRE {% token.concatenation %}

basicRE ->
    series        {% id %}
  | elementaryRE  {% id %}

series ->
    basicRE repeat  {% token.series %}

repeat ->
    %plus                                               {% token.repeat(1)  %}
  | %star                                               {% token.repeat(0)  %}
  | %mark                                               {% token.repeat(0, 1)         %}
  | %openingBrace %number %closingBrace                 {% data => token.repeat(data[1], data[1])(data)   %}
  | %openingBrace %number %comma %closingBrace          {% data => token.repeat(data[1])(data)            %}
  | %openingBrace %number %comma %number %closingBrace  {% data => token.repeat(data[1], data[3])(data)   %}

elementaryRE ->
    group     {% id %}
  | char      {% id %}
  | number    {% id %}
  | set       {% id %}
  | charset   {% id %}
  | %dot      {% token.create %}

group ->
    %openingParenthesis groupRE %closingParenthesis {% token.group %}

groupRE ->
    positionalLiteral:? RE {% token.concatenation %}

char  ->
    %char     {% token.create %}
  | %comma    {% token.char %}
  | %literal  {% token.char %}

number ->
    %number   {% token.create %}

charset  ->
    %charset  {% token.create %}

set  ->
    %positiveSetStart setItem:+ %setEnd {% token.set(true) %}
  | %negativeSetStart setItem:+ %setEnd {% token.set(false) %}

setItem  ->
    %range  {% token.range %}
  | char    {% id %}
  | charset {% id %}

positionalLiteral ->
    meta {% token.char %}

meta ->
     %bar                 {% id %}
   | %closingParenthesis  {% id %}
   | %openingParenthesis  {% id %}
   | %mark                {% id %}
   | %plus                {% id %}
   | %closingBrace        {% id %}
   | %openingBrace        {% id %}
   | %star                {% id %}
