enum TokenType {
  // Keywords
  VAR = "VAR",
  FUNCTION = "FUNCTION",

  // Control flow
  IF = "if",
  THEN = "then",
  ELSE = "else",

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
  QUOTE = '"',
  LEFT_PAREN = "(",
  RIGHT_PAREN = ")",
  LEFT_BRACE = "{",
  RIGHT_BRACE = "}",
  EQUAL = "=",
  DOUBLE_EQUAL = "==",
  NOT_EQ = "!=",
  QUESTION = "?",
  FUNCTION_ANNOTATION = "@",

  LT = "<",
  LT_EQ = "<=",
  GT = ">",
  GT_EQ = ">=",

  IDENTIFIER = "IDENTIFIER",
  STRING = "STRING",

  // Literal types
  BOOL = "boolean",
  NUMBER = "number",
  INT = "int",
  // TRUE = "True",
  // FALSE = "False",

  // Special functions
  USERINPUT = "USERINPUT",

  PLUS = "+",
  MINUS = "-",
  STAR = "*",
  PERCENT = "%",
  SLASH = "/",
  DOUBLE_SLASH = "//",
}

type Token = {
  token_type: TokenType;
  literal: string;
  line: number;
  begin_col: number;
  end_col: number;
  // These exist so @ "hi {name} it's me" can be parsed
  annotated_substrings: Token[];
  annotated_string: string[];
  annotated_expressions: Array<Token[]>;
};

export { Token, TokenType };
