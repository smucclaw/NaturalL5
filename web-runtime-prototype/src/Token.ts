enum TokenType {
  // Keywords
  VAR = "VAR",
  FUNCTION = "FUNCTION",

  // Control flow
  IF = "IF",
  THEN = "THEN",
  ELSE = "ELSE",

  // Symbols
  ARROW = "=>",
  SEMICOLON = ":",
  DOUBLE_SEMICOLON = "::",
  AND = "&&",
  OR = "||",
  NOT = "!",
  DOLLAR = "$",
  DOT = ".",
  COMMA = ",",
  BACKTICK = "`",
  LEFT_PAREN = "(",
  RIGHT_PAREN = ")",
  LEFT_BRACE = "{",
  RIGHT_BRACE = "}",

  IDENTIFIER = "IDENTIFIER",
  NUMBER = "NUMBER",
  STRING = "STRING",

  // Literal types
  BOOL = "bool",
  INT = "int",
  // TRUE = "True",
  // FALSE = "False",

  PLUS = "+",
  MINUS = "-",
  STAR = "*",
  SLASH = "/",
}

type Token = {
  token_type: TokenType;
  literal: string;
  line: number;
  begin_col: number;
  end_col: number;
};

export { Token, TokenType };
