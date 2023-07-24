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
    annotated_substrings: [],
    annotated_string: [],
    annotated_expressions: [],
  };
}

function make_templated_token(
  token_type: TokenType,
  literal: string,
  c: Context,
  substr_arr: Token[],
  str_arr: string[],
  expr_arr: Array<Token[]>
): Token {
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

function is_float(c: string): boolean {
  return (c >= "0" && c <= "9") || c == ".";
}

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

function lex(input: string): Array<Token> {
  const context: Context = {
    line: 1,
    begin_col: 1,
    end_col: 1,
  };

  const keywords = new Map<string, TokenType>([
    ["var", TokenType.VAR],
    ["function", TokenType.FUNCTION],
    ["if", TokenType.IF],
    ["then", TokenType.THEN],
    ["else", TokenType.ELSE],
    ["boolean", TokenType.BOOL],
    ["number", TokenType.NUMBER],
    ["int", TokenType.INT],
    ["UserInput", TokenType.USERINPUT],
    ["Any", TokenType.ANY],
    ["All", TokenType.ALL],
    ["switch", TokenType.SWITCH],
    ["case", TokenType.CASE],
    ["default", TokenType.DEFAULT],
    ["true", TokenType.TRUE],
    ["false", TokenType.FALSE],
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
        make_token_push_col(TokenType.MINUS, "-");
        break;
      case "*":
        make_token_push_col(TokenType.STAR, "*");
        break;
      case "/":
        // Just skip the entire line
        if (get_char(input, i + 1) == "/") {
          let extended_index = i + 1;
          while (
            extended_index < input.length &&
            input[extended_index] != "\n"
          ) {
            extended_index++;
          }
          i = extended_index;
        } else {
          make_token_push_col(TokenType.SLASH, "/");
        }
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
        // console.log(input);
        let extended_index = i + 1;
        while (extended_index < input.length && input[extended_index] != "`") {
          // console.log("#", input[extended_index]);
          extended_index++;
        }
        if (input[extended_index] != "`") {
          throw new Error("Backtick string not bounded!");
        }
        const substring = input.substring(i + 1, extended_index);
        make_token_push_col(
          TokenType.BACKTICK_STRING,
          substring,
          substring.length
        );
        i = extended_index;
        break;
      }
      case '"': {
        let extended_index = i + 1;
        let initial_left = i + 1;

        const annotated_substrs: Token[] = [];
        const annotated_string: string[] = [];
        const annotation_expr: Array<Token[]> = [];

        while (extended_index < input.length && input[extended_index] != '"') {
          if (input[extended_index] == "{") {
            annotated_substrs.push(
              make_token(
                TokenType.STRING,
                input.substring(initial_left, extended_index),
                context
              )
            );

            let quoted_index = extended_index + 1;
            while (quoted_index < input.length && input[quoted_index] != "}") {
              quoted_index++;
            }
            if (input[quoted_index] != "}") {
              throw new Error("Templated string not bounded!");
            }
            // Plus 1 to ignore the '{'
            const substr = input.substring(extended_index + 1, quoted_index);
            const tokens = lex(substr);
            annotated_string.push(substr);
            annotation_expr.push(tokens);
            initial_left = quoted_index + 1;
            extended_index = quoted_index + 1;
          } else {
            extended_index++;
          }
        }
        // If this is not a bounded string
        if (input[extended_index] != '"') {
          throw new Error("String not bounded!");
        }

        // Push an empty string at the end so that when re-assembling the stirng
        // this will always be consistent
        annotated_substrs.push(make_token(TokenType.STRING, "", context));

        const substring = input.substring(i + 1, extended_index);
        // make_token_push_col(TokenType.STRING, substring, substring.length);
        make_templated_token_push_col(
          TokenType.STRING,
          substring,
          substring.length,
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
      case "?":
        make_token_push_col(TokenType.QUESTION, "?");
        break;
      case "@":
        make_token_push_col(TokenType.FUNCTION_ANNOTATION, "@");
        break;
      case "%":
        make_token_push_col(TokenType.FUNCTION_ANNOTATION_RETURN, "%");
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
          // TODO: Replace with proper error handling
          console.error("a Single '|' token is not recognized in L5.");
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
          let extended_index = i;
          while (
            extended_index < input.length &&
            (is_number(input[extended_index] as string) ||
              is_float(input[extended_index] as string))
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

export { lex, make_token, Context };
