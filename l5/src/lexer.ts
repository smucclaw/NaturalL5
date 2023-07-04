import { Token, TokenType } from "./token";

export type Context = {
  line: number;
  begin_col: number;
  end_col: number;
};

export function make_token(
  token_type: TokenType,
  literal: string,
  c: Context
): Token {
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

// function is_float(c: string): boolean {
//   return (c >= "0" && c <= "9") || c == ".";
// }

// Alpha-numeric + underscores + question marks
function is_label(c: string): boolean {
  if (
    (c >= "0" && c <= "9") ||
    (c >= "a" && c <= "z") ||
    (c >= "A" && c <= "Z") ||
    c == "_" ||
    c == "?"
  ) {
    return true;
  }
  return false;
}

export function lex(input: string): Array<Token> {
  const context: Context = {
    line: 1,
    begin_col: 1,
    end_col: 1,
  };

  const keywords: Map<string, TokenType> = new Map<string, TokenType>([
    // Keywords
    ["PARTY", TokenType.PARTY],
    ["WHERE", TokenType.WHERE],
    ["MUST", TokenType.MUST],
    ["MEANS", TokenType.MEANS],
    // Deontic actions
    ["OBLIGATED", TokenType.OBLIGATED],
    ["PERMITTED", TokenType.PERMITTED],
    ["FULFILLED", TokenType.FULFILLED],
    ["PERFORMED", TokenType.PERFORMED],
    // Control flow
    ["IF", TokenType.IF],
    ["THEN", TokenType.THEN],
    ["ELSE", TokenType.ELSE],
    // Temporal constraints
    ["WITHIN", TokenType.WITHIN],
    ["BETWEEN", TokenType.BETWEEN],
    ["BEFORE", TokenType.BEFORE],
    ["BEFORE_ON", TokenType.BEFORE_ON],
    ["AFTER", TokenType.AFTER],
    ["AFTER_ON", TokenType.AFTER_ON],
    ["ON", TokenType.ON],
    // Action Duration
    ["UNTIL", TokenType.UNTIL],
    ["FOR", TokenType.FOR],
    ["BLAME", TokenType.BLAME],
    // Literal types
    ["bool", TokenType.BOOL],
    ["int", TokenType.INT],
    ["True", TokenType.TRUE],
    ["False", TokenType.FALSE],
    // Instancing syntax
    ["declare", TokenType.DECLARE],
  ]);

  const get_char = (input: string, index: number): string => {
    const char = input.at(index);
    if (char == undefined) {
      return "";
    }
    return char;
  };

  const tokens: Array<Token> = [];

  const make_token_push_col = (token: TokenType, literal: string, jump = 1) => {
    context.end_col += jump;
    tokens.push(make_token(token, literal, context));
    context.begin_col += jump;
  };

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
        make_token_push_col(TokenType.PLUS, "+");
        break;
      case "-":
        // Just skip the entire line
        if (get_char(input, i + 1) == "-") {
          let extended_index = i + 1;
          while (
            extended_index < input.length &&
            input[extended_index] != "\n"
          ) {
            extended_index++;
          }
          i = extended_index;
        } else if (get_char(input, i + 1) == ">") {
          make_token_push_col(TokenType.ARROW, "->");
          i++;
        } else {
          make_token_push_col(TokenType.MINUS, "-");
        }
        break;
      case "*":
        make_token_push_col(TokenType.STAR, "*");
        break;
      case "/":
        make_token_push_col(TokenType.SLASH, "/");
        break;
      case "!":
        if (get_char(input, i + 1) == "=") {
          make_token_push_col(TokenType.NOT_EQ, "!=", 2);
          i++;
        } else {
          make_token_push_col(TokenType.NOT, "!");
        }
        break;
      case "$":
        make_token_push_col(TokenType.DOLLAR, "$");
        break;
      case ".":
        make_token_push_col(TokenType.DOT, ".");
        break;
      case ",":
        make_token_push_col(TokenType.COMMA, ",");
        break;
      case "`": {
        // TODO : Add escaping of `
        let extended_index = i + 1;
        while (extended_index < input.length && input[extended_index] != "`") {
          extended_index++;
        }
        // If this is not a bounded string
        if (input[extended_index] != '"') {
          throw new Error("String not bounded!");
        }
        const substring = input.substring(i + 1, extended_index);
        make_token_push_col(
          TokenType.QUOTED_STRING,
          substring,
          substring.length
        );
        i = extended_index;
        break;
      }
      case '"': {
        // TODO : Add escaping of "
        let extended_index = i + 1;
        while (extended_index < input.length && input[extended_index] != '"') {
          extended_index++;
        }
        // If this is not a bounded string
        if (input[extended_index] != '"') {
          throw new Error("String not bounded!");
        }
        const substring = input.substring(i + 1, extended_index);
        make_token_push_col(
          TokenType.QUOTED_STRING,
          substring,
          substring.length
        );
        i = extended_index;
        break;
      }
      case "(":
        make_token_push_col(TokenType.LEFT_PAREN, "(");
        break;
      case ")":
        make_token_push_col(TokenType.RIGHT_PAREN, ")");
        break;
      case "{":
        make_token_push_col(TokenType.LEFT_BRACE, "{");
        break;
      case "}":
        make_token_push_col(TokenType.RIGHT_BRACE, "}");
        break;
      case "?":
        make_token_push_col(TokenType.QUESTION, "?");
        break;
      case "<":
        if (get_char(input, i + 1) == "=") {
          make_token_push_col(TokenType.LT_EQ, "<=", 2);
          i++;
        } else {
          make_token_push_col(TokenType.LT, "<");
        }
        break;
      case ">":
        if (get_char(input, i + 1) == "=") {
          make_token_push_col(TokenType.GT_EQ, ">=", 2);
          i++;
        } else {
          make_token_push_col(TokenType.GT, ">");
        }
        break;
      case ":":
        if (get_char(input, i + 1) == ":") {
          make_token_push_col(TokenType.DOUBLE_COLON, "::", 2);
          i++;
        } else {
          make_token_push_col(TokenType.COLON, ":");
        }
        break;
      case ";":
        make_token_push_col(TokenType.SEMICOLON, ";");
        break;
      case "&":
        if (get_char(input, i + 1) == "&") {
          make_token_push_col(TokenType.AND, "&&", 2);
          i++;
        } else {
          // TODO: Replace with proper error handling
          console.error("A single '&' token is not recognized in L5.");
        }
        break;
      case "|":
        if (get_char(input, i + 1) == "|") {
          make_token_push_col(TokenType.OR, "||", 2);
          i++;
        } else {
          make_token_push_col(TokenType.SINGLE_PIPE, "|", 1);
        }
        break;
      case "=":
        if (get_char(input, i + 1) == ">") {
          make_token_push_col(TokenType.ARROW, "=>", 2);
          i++;
        } else if (get_char(input, i + 1) == "=") {
          make_token_push_col(TokenType.DOUBLE_EQUAL, "==", 2);
          i++;
        } else {
          make_token_push_col(TokenType.EQUAL, "=");
        }
        break;
      // Handle the keyword cases
      default:
        if (is_number(char as string)) {
          // let extended_index = i;
          // while (
          //   extended_index < input.length &&
          //   is_number(input[extended_index] as string)
          // ) {
          //   extended_index++;
          // }
          // const number_string = input.substring(i, extended_index);
          // make_token_push_col(
          //   TokenType.NUMBER,
          //   number_string,
          //   number_string.length
          // );
          // i = extended_index - 1;
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
            make_token_push_col(
              keywords.get(label) as TokenType,
              label,
              label.length
            );
          } else {
            // It's an identifier
            make_token_push_col(TokenType.IDENTIFIER, label, label.length);
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
