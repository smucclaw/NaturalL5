import { Token, TokenType } from "./Token";

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

function is_number(c: string): boolean {
  return c >= "0" && c <= "9";
}

// Alpha-numeric + underscores + question marks
function is_label(c: string): boolean {
  if (
    (c >= "0" && c <= "9") ||
    (c >= "a" && c <= "z") ||
    (c >= "A" && c <= "Z") ||
    c == "_" ||
    c == "-" ||
    c == "?"
  ) {
    return true;
  }
  return false;
}

function lex(input: string): Array<Token> {
  const context: Context = {
    line: 1,
    begin_col: 1,
    end_col: 1,
  };

  const keywords: Map<string, TokenType> = new Map<string, TokenType>([
    ["var", TokenType.VAR],
    ["function", TokenType.FUNCTION],
    ["IF", TokenType.IF],
    ["THEN", TokenType.THEN],
    ["ELSE", TokenType.ELSE],
    ["bool", TokenType.BOOL],
    ["int", TokenType.INT],
  ]);

  const get_char = (input: string, index: number): string => {
    const char = input.at(index);
    if (char == undefined) {
      return "";
    }
    return char;
  };

  const tokens: Array<Token> = [];

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    switch (char) {
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
        tokens.push(make_token(TokenType.MINUS, "-", context));
        break;
      case "*":
        tokens.push(make_token(TokenType.STAR, "*", context));
        break;
      case "/":
        tokens.push(make_token(TokenType.SLASH, "/", context));
        break;
      case "!":
        tokens.push(make_token(TokenType.NOT, "!", context));
        break;
      case "$":
        tokens.push(make_token(TokenType.DOLLAR, "$", context));
        break;
      case ".":
        tokens.push(make_token(TokenType.DOT, ".", context));
        break;
      case ",":
        tokens.push(make_token(TokenType.COMMA, ",", context));
        break;
      case "`":
        tokens.push(make_token(TokenType.BACKTICK, "`", context));
        break;
      case "(":
        tokens.push(make_token(TokenType.LEFT_PAREN, "(", context));
        break;
      case ")":
        tokens.push(make_token(TokenType.RIGHT_PAREN, ")", context));
        break;
      case "{":
        tokens.push(make_token(TokenType.LEFT_BRACE, "{", context));
        break;
      case "}":
        tokens.push(make_token(TokenType.RIGHT_BRACE, "}", context));
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
          // TODO: Replace with proper error handling
          console.error("A single '&' token is not recognized in L5.");
        }
        break;
      case "|":
        if (get_char(input, i + 1) == "|") {
          tokens.push(make_token(TokenType.OR, "||", context));
          i++;
        } else {
          // TODO: Replace with proper error handling
          console.error("a Single '|' token is not recognized in L5.");
        }
        break;
      case "=":
        if (get_char(input, i + 1) == ">") {
          tokens.push(make_token(TokenType.ARROW, "=>", context));
          i++;
        } else if (get_char(input, i + 1) == "=") {
          tokens.push(make_token(TokenType.DOUBLE_EQUAL, "==", context));
          i++;
        } else {
          tokens.push(make_token(TokenType.EQUAL, "=", context));
        }
        break;
      // Handle the keyword cases
      default:
        if (is_number(char as string)) {
          let extended_index = i;
          while (
            extended_index < input.length &&
            is_number(input[extended_index] as string)
          ) {
            extended_index++;
          }
          tokens.push(
            make_token(
              TokenType.NUMBER,
              input.substring(i, extended_index),
              context
            )
          );
          i = extended_index - 1;
        } else if (is_label(char as string)) {
          let extended_index = i;
          while (
            extended_index < input.length &&
            is_label(input[extended_index] as string)
          ) {
            extended_index++;
          }

          const label: string = input.substring(i, extended_index);
          // It's a keyword
          if (keywords.has(label)) {
            tokens.push(
              make_token(keywords.get(label) as TokenType, label, context)
            );
          } else {
            // It's an identifier
            tokens.push(make_token(TokenType.IDENTIFIER, label, context));
          }
          i = extended_index - 1;
        } else {
          // TODO: Replace with proper error handling
          console.error(
            "This is a token that L5 does not support. Recieved : ",
            char
          );
        }
        break;
    }
  }

  return tokens;
}

export { lex };
