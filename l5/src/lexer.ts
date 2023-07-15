import { ErrorContext, SourceAnnotation } from "./errors";
import { TemplatedToken, Token, TokenType } from "./token";
import { peek } from "./utils";

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

export function make_templated_token(
  token_type: TokenType,
  literal: string,
  c: Context,
  substr_arr: Token[],
  str_arr: string[],
  expr_arr: Array<Token[]>
): TemplatedToken {
  return {
    token_type: token_type,
    literal: literal,
    line: c.line,
    begin_col: c.begin_col,
    end_col: c.end_col,
    annotated_substrings: substr_arr,
    annotated_string: str_arr,
    annotated_expressions: expr_arr,
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

export function lex(input: string, errctx: ErrorContext): Array<Token> {
  const context: Context = {
    line: 1,
    begin_col: 1,
    end_col: 1,
  };

  const keywords: Map<string, TokenType> = new Map<string, TokenType>([
    // Keywords
    ["PARTY", TokenType.PARTY],
    ["WHERE", TokenType.WHERE],
    ["WHEN", TokenType.WHEN],
    ["MUST", TokenType.MUST],
    ["MEANS", TokenType.MEANS],
    // Deontic actions
    ["ALWAYS", TokenType.ALWAYS],
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
    ["BEFORE", TokenType.BEFORE],
    ["BEFORE_ON", TokenType.BEFORE_ON],
    ["AFTER", TokenType.AFTER],
    ["AFTER_ON", TokenType.AFTER_ON],
    ["ON", TokenType.ON],
    ["DAY", TokenType.DAY],
    ["MONTH", TokenType.MONTH],
    ["YEAR", TokenType.YEAR],
    // Logical Operators
    ["AND", TokenType.AND],
    ["OR", TokenType.OR],
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
    ["DECLARE", TokenType.DECLARE],
    // Declaring constitutive definitions
    ["DEFINE", TokenType.DEFINE],
    // Declaring types
    ["TYPE", TokenType.TYPE],
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

  const make_templated_token_push_col = (
    token: TokenType,
    literal: string,
    jump = 1,
    substr_arr: Token[],
    str_arr: string[],
    expr_arr: Array<Token[]>
  ) => {
    context.end_col += jump;
    tokens.push(
      make_templated_token(
        token,
        literal,
        context,
        substr_arr,
        str_arr,
        expr_arr
      )
    );
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
      case "\r":
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
        while (
          extended_index < input.length &&
          !"`\n\r".includes(input[extended_index]!)
        ) {
          extended_index++;
        }
        const substring = input.substring(i + 1, extended_index);
        make_token_push_col(
          TokenType.BACKTICK_STRING,
          substring,
          substring.length + 2
        );
        // If this is not a bounded string
        if (input[extended_index] != "`") {
          throw errctx.createError(
            "SyntaxError",
            "String not bounded!",
            new SourceAnnotation([peek(tokens)])
          );
        }
        i = extended_index;
        break;
      }
      case '"': {
        // TODO : Add escaping of "
        let extended_index = i + 1;
        let initial_left = i + 1;

        const annotated_substrs: Token[] = [];
        const annotated_string: string[] = [];
        const annotation_expr: Array<Token[]> = [];

        while (
          extended_index < input.length &&
          !`"\n\r`.includes(input[extended_index]!)
        ) {
          // If "{", glob everything up to that point and
          // push that into the substr
          if (input[extended_index] == "{") {
            annotated_substrs.push(
              make_token(
                TokenType.QUOTED_STRING,
                input.substring(initial_left, extended_index),
                context
              )
            );

            let quoted_index = extended_index + 1;
            while (quoted_index < input.length && input[quoted_index] != "}") {
              quoted_index++;
            }

            if (input[quoted_index] != "}") {
              throw errctx.createError(
                "SyntaxError",
                "RelationalTemplate not bounded, have '{' but not the closing equivalent '}'",
                new SourceAnnotation([peek(tokens)])
              );
            }

            // Plus 1 to ignore the '{'
            const substr = input.substring(extended_index + 1, quoted_index);
            const annotated_tokens = lex(substr, errctx);
            annotated_string.push(substr);
            annotation_expr.push(annotated_tokens);
            initial_left = quoted_index + 1;
            extended_index = quoted_index + 1;
          } else {
            extended_index++;
          }
        }

        // If this is not a bounded string
        if (input[extended_index] != '"') {
          throw errctx.createError(
            "SyntaxError",
            "Quoted String not bounded!",
            new SourceAnnotation([peek(tokens)])
          );
        }

        // Push an empty string at the end so that when re-assembling the string
        // this will always be consistent
        annotated_substrs.push(
          // make_token(TokenType.QUOTED_STRING, "", context)
          make_token(
            TokenType.QUOTED_STRING,
            input.substring(initial_left, extended_index),
            context
          )
        );

        const substring = input.substring(i + 1, extended_index);

        make_templated_token_push_col(
          TokenType.QUOTED_STRING,
          substring,
          substring.length + 2,
          annotated_substrs,
          annotated_string,
          annotation_expr
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
      case "[":
        make_token_push_col(TokenType.LEFT_BRACKET, "{");
        break;
      case "]":
        make_token_push_col(TokenType.RIGHT_BRACKET, "}");
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
      case "|":
        make_token_push_col(TokenType.SINGLE_PIPE, "|", 1);
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
          let extended_index = i;
          while (
            extended_index < input.length &&
            is_number(input[extended_index] as string)
          ) {
            extended_index++;
          }
          const number_string = input.substring(i, extended_index);
          make_token_push_col(
            TokenType.NUMBER,
            number_string,
            number_string.length
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
          make_token_push_col(TokenType.UNKNOWN, char!, 1);
          throw errctx.createError(
            "SyntaxError",
            `This is a token that L5 does not support. Recieved : ${char}`,
            new SourceAnnotation([peek(tokens)])
          );
        }
        break;
    }
  }

  return tokens;
}
