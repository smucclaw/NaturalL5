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
  SEMICOLON = ";",
  COLON = ":",
  DOUBLE_COLON = "::",
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
  EQUAL = "=",
  DOUBLE_EQUAL = "==",

  LT = "<",
  LT_EQ = "<=",
  GT = ">",
  GT_EQ = ">=",

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
