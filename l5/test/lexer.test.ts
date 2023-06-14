import { describe, expect, test } from "@jest/globals";
import { lex } from "../src/lexer";
import { Token, TokenType } from "../src/token";

describe("Lexer", () => {
  test("single characters tokens", () => {
    const test_string = ` +-*/
    ?
    < >
    ! $
    :
    `;
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
      TokenType.SEMICOLON,
    ];
    const test_token_lines: Array<number> = [1, 1, 1, 1, 2, 3, 3, 4, 4, 5];

    tokens.forEach((token: Token, i: number) => {
      expect(token.token_type).toBe(test_token_types[i]);
      expect(token.line).toBe(test_token_lines[i]);
    });
  });

  test("double character tokens", () => {
    const test_string = `::
    &&
    ||
    --
    `;
    const tokens: Array<Token> = lex(test_string);
    const test_token_types: Array<TokenType> = [
      TokenType.DOUBLE_SEMICOLON,
      TokenType.AND,
      TokenType.OR,
      TokenType.COMMENT,
    ];
    const test_token_lines: Array<number> = [1, 2, 3, 4];

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

  test("identifiers", () => {
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

  test("keywords", () => {
    const test_string = ` PARTY WHERE MUST MEANS
    OBLIGATED PERMITTED
    FULFILLED PERFORMED
    IF THEN ELSE
    WITHIN BETWEEN
    BEFORE BEFORE_ON
    AFTER AFTER_ON
    ON
    Action`;

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
    ];
    const test_token_lines: Array<number> = [
      1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5, 5, 6, 6, 7, 7, 8, 9,
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
    ];

    tokens.forEach((token: Token, i: number) => {
      expect(token.token_type).toBe(test_token_types[i]);
      expect(token.line).toBe(test_token_lines[i]);
      expect(token.literal).toBe(test_token_literals[i]);
    });
  });
});
