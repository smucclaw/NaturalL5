import { describe, expect, test } from "@jest/globals";
import { lex } from "../src/Lexer";
import { Token, TokenType } from "../src/Token";

describe("Lexer", () => {
  test("Columns", () => {
    const test_string = `
        +
        - *
    `;
    const tokens: Array<Token> = lex(test_string);
    const test_token_types: Array<TokenType> = [
      TokenType.PLUS,
      TokenType.MINUS,
      TokenType.STAR,
    ];
    const test_token_lines: Array<number> = [2, 3, 3];
    const begin_cols: Array<number> = [9, 9, 11];
    const end_cols: Array<number> = [10, 10, 12];

    tokens.forEach((token: Token, i: number) => {
      expect(token.token_type).toBe(test_token_types[i]);
      expect(token.line).toBe(test_token_lines[i]);
      expect(token.begin_col).toBe(begin_cols[i]);
      expect(token.end_col).toBe(end_cols[i]);
    });
  });

  test("Columns with strings and numbers", () => {
    const test_string = `
        var a = 10;
        var b = 1200;
    `;
    const tokens: Array<Token> = lex(test_string);
    const test_token_types: Array<TokenType> = [
      TokenType.VAR,
      TokenType.IDENTIFIER,
      TokenType.EQUAL,
      TokenType.NUMBER,
      TokenType.SEMICOLON,
      TokenType.VAR,
      TokenType.IDENTIFIER,
      TokenType.EQUAL,
      TokenType.NUMBER,
      TokenType.SEMICOLON,
    ];
    const test_token_lines: Array<number> = [2, 2, 2, 2, 2, 3, 3, 3, 3, 3];
    const begin_cols: Array<number> = [9, 13, 15, 17, 19, 9, 13, 15, 17, 21];
    const end_cols: Array<number> = [12, 14, 16, 19, 20, 12, 14, 16, 21, 22];

    tokens.forEach((token: Token, i: number) => {
      expect(token.token_type).toBe(test_token_types[i]);
      expect(token.line).toBe(test_token_lines[i]);
      expect(token.begin_col).toBe(begin_cols[i]);
      expect(token.end_col).toBe(end_cols[i]);
    });
  });
});
