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
});
