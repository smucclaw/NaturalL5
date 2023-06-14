import { Token, TokenType } from "./token";

type Context = {
  line: number;
  begin_col: number;
  end_col: number;
};

function make_token(token_type: TokenType, literal: string, c: Context): Token {
  return {
    token_type: token_type,
    literal: literal,
    line: c.line,
    begin_col: c.begin_col,
    end_col: c.end_col,
  };
}

function lex(input: string): Array<Token> {
  const context: Context = {
    line: 1,
    begin_col: 1,
    end_col: 1,
  };

  const get_char = (input: string, index: number): string => {
    const char = input.at(index);
    if (char == undefined) {
      return "";
    }
    return char;
  };

  const tokens: Array<Token> = [];

  for (let i = 0; i < input.length; i++) {
    switch (input[i]) {
      // Handle the various forms of whitespace
      case " ":
        context.begin_col++;
        context.end_col++;
        break;
      case "\n":
        context.line++;
        context.begin_col = 1;
        context.end_col = 1;
        break;
      // Handle single character tokens
      case "+":
        tokens.push(make_token(TokenType.PLUS, "+", context));
        break;
      case "-":
        if (get_char(input, i + 1) == "-") {
          tokens.push(make_token(TokenType.COMMENT, "--", context));
          i++;
        } else {
          tokens.push(make_token(TokenType.MINUS, "-", context));
        }
        break;
      case "*":
        tokens.push(make_token(TokenType.STAR, "*", context));
        break;
      case "/":
        tokens.push(make_token(TokenType.SLASH, "/", context));
        break;
      case "?":
        tokens.push(make_token(TokenType.TERNARY, "?", context));
        break;
      case "<":
        tokens.push(make_token(TokenType.LEFT_ARROW, "<", context));
        break;
      case ">":
        tokens.push(make_token(TokenType.RIGHT_ARROW, ">", context));
        break;
      case "!":
        tokens.push(make_token(TokenType.NOT, "!", context));
        break;
      case "$":
        tokens.push(make_token(TokenType.DOLLAR, "$", context));
        break;
      case "`":
        tokens.push(make_token(TokenType.BACKTICK, "`", context));
        break;
      case ":":
        if (get_char(input, i + 1) == ":") {
          tokens.push(make_token(TokenType.DOUBLE_SEMICOLON, "::", context));
          i++;
        } else {
          tokens.push(make_token(TokenType.SEMICOLON, ":", context));
        }
        break;
      case "&":
        if (get_char(input, i + 1) == "&") {
          tokens.push(make_token(TokenType.AND, "&&", context));
          i++;
        } else {
          console.log("A single '&' token is not recognized in L5.");
        }
        break;
      case "|":
        if (get_char(input, i + 1) == "|") {
          tokens.push(make_token(TokenType.OR, "||", context));
          i++;
        } else {
          console.log("a Single '|' token is nto recognized in L5.");
        }
        break;
    }
  }

  return tokens;
}

export { lex };
