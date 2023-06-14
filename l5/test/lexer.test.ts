import { describe, expect, test } from "@jest/globals";
import { lex } from "../src/lexer";
import { Token, TokenType } from "../src/token";

describe("Lexer", () => {
  test("Single characters tokens", () => {
    const test_string = ` +-*/
    ?
    < >
    ! $ .
    :
    \`
    ( )
    { }`;
    const tokens: Array<Token> = lex(test_string);
    const test_token_types: Array<TokenType> = [
      TokenType.PLUS,
      TokenType.MINUS,
      TokenType.STAR,
      TokenType.SLASH,
      TokenType.TERNARY,
      TokenType.LEFT_ARROW,
      TokenType.RIGHT_ARROW,
      TokenType.NOT,
      TokenType.DOLLAR,
      TokenType.DOT,
      TokenType.SEMICOLON,
      TokenType.BACKTICK,
      TokenType.LEFT_BRACKET,
      TokenType.RIGHT_BRACKET,
      TokenType.LEFT_BRACE,
      TokenType.RIGHT_BRACE,
    ];
    const test_token_lines: Array<number> = [
      1, 1, 1, 1, 2, 3, 3, 4, 4, 4, 5, 6, 7, 7, 8, 8,
    ];

    tokens.forEach((token: Token, i: number) => {
      expect(token.token_type).toBe(test_token_types[i]);
      expect(token.line).toBe(test_token_lines[i]);
    });
  });

  test("Double character tokens", () => {
    const test_string = `::
    &&
    ||
    --
    =>
    `;
    const tokens: Array<Token> = lex(test_string);
    const test_token_types: Array<TokenType> = [
      TokenType.DOUBLE_SEMICOLON,
      TokenType.AND,
      TokenType.OR,
      TokenType.COMMENT,
      TokenType.ARROW,
    ];
    const test_token_lines: Array<number> = [1, 2, 3, 4, 5];

    tokens.forEach((token: Token, i: number) => {
      expect(token.token_type).toBe(test_token_types[i]);
      expect(token.line).toBe(test_token_lines[i]);
    });
  });

  test("numeric values", () => {
    const test_string = `123
    456`;

    const tokens: Array<Token> = lex(test_string);
    const test_token_types: Array<TokenType> = [
      TokenType.NUMBER,
      TokenType.NUMBER,
    ];
    const test_token_lines: Array<number> = [1, 2];
    const test_token_literals: Array<string> = ["123", "456"];

    tokens.forEach((token: Token, i: number) => {
      expect(token.token_type).toBe(test_token_types[i]);
      expect(token.line).toBe(test_token_lines[i]);
      expect(token.literal).toBe(test_token_literals[i]);
    });
  });

  test("Identifiers", () => {
    const test_string = `abc
    def`;

    const tokens: Array<Token> = lex(test_string);
    const test_token_types: Array<TokenType> = [
      TokenType.IDENTIFIER,
      TokenType.IDENTIFIER,
    ];
    const test_token_lines: Array<number> = [1, 2];
    const test_token_literals: Array<string> = ["abc", "def"];

    tokens.forEach((token: Token, i: number) => {
      expect(token.token_type).toBe(test_token_types[i]);
      expect(token.line).toBe(test_token_lines[i]);
      expect(token.literal).toBe(test_token_literals[i]);
    });
  });

  test("Keywords", () => {
    const test_string = ` PARTY WHERE MUST MEANS
    OBLIGATED PERMITTED
    FULFILLED PERFORMED
    IF THEN ELSE
    WITHIN BETWEEN
    BEFORE BEFORE_ON
    AFTER AFTER_ON
    ON
    Action
    bool int`;

    const tokens: Array<Token> = lex(test_string);
    const test_token_types: Array<TokenType> = [
      TokenType.PARTY,
      TokenType.WHERE,
      TokenType.MUST,
      TokenType.MEANS,
      TokenType.OBLIGATED,
      TokenType.PERMITTED,
      TokenType.FULFILLED,
      TokenType.PERFORMED,
      TokenType.IF,
      TokenType.THEN,
      TokenType.ELSE,
      TokenType.WITHIN,
      TokenType.BETWEEN,
      TokenType.BEFORE,
      TokenType.BEFORE_ON,
      TokenType.AFTER,
      TokenType.AFTER_ON,
      TokenType.ON,
      TokenType.ACTION,
      TokenType.BOOL,
      TokenType.INT,
    ];
    const test_token_lines: Array<number> = [
      1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5, 5, 6, 6, 7, 7, 8, 9, 10, 10,
    ];
    const test_token_literals: Array<string> = [
      "PARTY",
      "WHERE",
      "MUST",
      "MEANS",
      "OBLIGATED",
      "PERMITTED",
      "FULFILLED",
      "PERFORMED",
      "IF",
      "THEN",
      "ELSE",
      "WITHIN",
      "BETWEEN",
      "BEFORE",
      "BEFORE_ON",
      "AFTER",
      "AFTER_ON",
      "ON",
      "Action",
      "bool",
      "int",
    ];

    tokens.forEach((token: Token, i: number) => {
      expect(token.token_type).toBe(test_token_types[i]);
      expect(token.line).toBe(test_token_lines[i]);
      expect(token.literal).toBe(test_token_literals[i]);
    });
  });

  test("Example: Must Sing 1", () => {
    const test_string = `
    Person {
      walk: bool
      \`consuming an alcoholic beverage\`: bool
      \`consuming a non-alcoholic beverage\`: bool
      eat: bool
    }
    
    \`{Person} sing\`: Action
    
    qualifies(t:Person) => t.walk && (drink(t) || t.eat)
    drink(t:Person) => t.\`consuming an alcoholic beverage\` || t.\`consuming a non-alcoholic beverage\`
    
    $ \`Must you sing?\` :: person:Person 
        WHERE qualifies<Person>(person) 
        OBLIGATED \`{person} sing\`
    `;

    const tokens = lex(test_string);
    const test_token_types: Array<TokenType> = [
      TokenType.IDENTIFIER, // Person
      TokenType.LEFT_BRACE, // {
      TokenType.IDENTIFIER, // walk
      TokenType.SEMICOLON, // :
      TokenType.BOOL, // bool
      TokenType.BACKTICK, // `
      TokenType.IDENTIFIER, // consuming
      TokenType.IDENTIFIER, // an
      TokenType.IDENTIFIER, // alcoholic
      TokenType.IDENTIFIER, // beverage
      TokenType.BACKTICK, // `
      TokenType.SEMICOLON, // :
      TokenType.BOOL, // bool
      TokenType.BACKTICK, // `
      TokenType.IDENTIFIER, // consuming
      TokenType.IDENTIFIER, // a
      TokenType.IDENTIFIER, // non-alcoholic
      TokenType.IDENTIFIER, // beverage
      TokenType.BACKTICK, // `
      TokenType.SEMICOLON, // :
      TokenType.BOOL, // bool
      TokenType.IDENTIFIER, // eat
      TokenType.SEMICOLON, // :
      TokenType.BOOL, // bool
      TokenType.RIGHT_BRACE, // }
      TokenType.BACKTICK, // `
      TokenType.LEFT_BRACE, // {
      TokenType.IDENTIFIER, // Person
      TokenType.RIGHT_BRACE, // }
      TokenType.IDENTIFIER, // sing
      TokenType.BACKTICK, // `
      TokenType.SEMICOLON, // :
      TokenType.ACTION, // Action
      TokenType.IDENTIFIER, // qualifies
      TokenType.LEFT_BRACKET, // (
      TokenType.IDENTIFIER, // t
      TokenType.SEMICOLON, // :
      TokenType.IDENTIFIER, // Person
      TokenType.RIGHT_BRACKET, // )
      TokenType.ARROW, // =>
      TokenType.IDENTIFIER, // t
      TokenType.DOT, // .
      TokenType.IDENTIFIER, // walk
      TokenType.AND, // &&
      TokenType.LEFT_BRACKET, // (
      TokenType.IDENTIFIER, // drink
      TokenType.LEFT_BRACKET, // (
      TokenType.IDENTIFIER, // t
      TokenType.RIGHT_BRACKET, // )
      TokenType.OR, // ||
      TokenType.IDENTIFIER, // t
      TokenType.DOT, // .
      TokenType.IDENTIFIER, // eat
      TokenType.RIGHT_BRACKET, // )
      TokenType.IDENTIFIER, // drink
      TokenType.LEFT_BRACKET, // (
      TokenType.IDENTIFIER, // t
      TokenType.SEMICOLON, // :
      TokenType.IDENTIFIER, // Person
      TokenType.RIGHT_BRACKET, // )
      TokenType.ARROW, // =>
      TokenType.IDENTIFIER, // t
      TokenType.DOT, // .
      TokenType.BACKTICK, // `
      TokenType.IDENTIFIER, // consuming
      TokenType.IDENTIFIER, // an
      TokenType.IDENTIFIER, // alcoholic
      TokenType.IDENTIFIER, // beverage
      TokenType.BACKTICK, // `
      TokenType.OR, // ||
      TokenType.IDENTIFIER, // t
      TokenType.DOT, // .
      TokenType.BACKTICK, // `
      TokenType.IDENTIFIER, // consuming
      TokenType.IDENTIFIER, // a
      TokenType.IDENTIFIER, // non-alcoholic
      TokenType.IDENTIFIER, // beverage
      TokenType.BACKTICK, // `
      TokenType.DOLLAR, // $
      TokenType.BACKTICK, // `
      TokenType.IDENTIFIER, // Must
      TokenType.IDENTIFIER, // you
      TokenType.IDENTIFIER, // sing?
      TokenType.BACKTICK, // `
      TokenType.DOUBLE_SEMICOLON, // ::
      TokenType.IDENTIFIER, // person
      TokenType.SEMICOLON, // :
      TokenType.IDENTIFIER, // Person
      TokenType.WHERE, // where
      TokenType.IDENTIFIER, // qualifies
      TokenType.LEFT_ARROW, // <
      TokenType.IDENTIFIER, // Person
      TokenType.RIGHT_ARROW, // >
      TokenType.LEFT_BRACKET, // (
      TokenType.IDENTIFIER, // person
      TokenType.RIGHT_BRACKET, // )
      TokenType.OBLIGATED, // OBLIGATED
      TokenType.BACKTICK, // `
      TokenType.LEFT_BRACE, // {
      TokenType.IDENTIFIER, // person
      TokenType.RIGHT_BRACE, // }
      TokenType.IDENTIFIER, // sing
      TokenType.BACKTICK, // `
    ];
    const test_token_literals: Array<string> = [
      "Person",
      "{",
      "walk",
      ":",
      "bool",
      "`",
      "consuming",
      "an",
      "alcoholic",
      "beverage",
      "`",
      ":",
      "bool",
      "`",
      "consuming",
      "a",
      "non-alcoholic",
      "beverage",
      "`",
      ":",
      "bool",
      "eat",
      ":",
      "bool",
      "}",
      "`",
      "{",
      "Person",
      "}",
      "sing",
      "`",
      ":",
      "Action",
      "qualifies",
      "(",
      "t",
      ":",
      "Person",
      ")",
      "=>",
      "t",
      ".",
      "walk",
      "&&",
      "(",
      "drink",
      "(",
      "t",
      ")",
      "||",
      "t",
      ".",
      "eat",
      ")",
      "drink",
      "(",
      "t",
      ":",
      "Person",
      ")",
      "=>",
      "t",
      ".",
      "`",
      "consuming",
      "an",
      "alcoholic",
      "beverage",
      "`",
      "||",
      "t",
      ".",
      "`",
      "consuming",
      "a",
      "non-alcoholic",
      "beverage",
      "`",
      "$",
      "`",
      "Must",
      "you",
      "sing?",
      "`",
      "::",
      "person",
      ":",
      "Person",
      "WHERE",
      "qualifies",
      "<",
      "Person",
      ">",
      "(",
      "person",
      ")",
      "OBLIGATED",
      "`",
      "{",
      "person",
      "}",
      "sing",
      "`",
    ];
    const test_token_lines: Array<number> = [
      2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 7,
      9, 9, 9, 9, 9, 9, 9, 9, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11,
      11, 11, 11, 11, 11, 11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12,
      12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 14, 14, 14,
      14, 14, 14, 14, 14, 14, 14, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 16,
      16, 16, 16, 16,
    ];

    tokens.forEach((token: Token, i: number) => {
      expect(token.token_type).toBe(test_token_types[i]);
      expect(token.literal).toBe(test_token_literals[i]);
      expect(token.line).toBe(test_token_lines[i]);
    });
  });
});
