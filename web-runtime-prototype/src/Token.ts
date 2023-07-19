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
  FUNCTION_ANNOTATION_RETURN = "%",

  LT = "<",
  LT_EQ = "<=",
  GT = ">",
  GT_EQ = ">=",

  IDENTIFIER = "IDENTIFIER",
  STRING = "STRING",
  BACKTICK_STRING = "BACKTICK_STRING",

  // Literal types
  BOOL = "boolean",
  NUMBER = "number",
  INT = "int",
  // TRUE = "True",
  // FALSE = "False",

  // Special functions
  USERINPUT = "USERINPUT",
  ANY = "ANY",
  ALL = "ALL",
  SWITCH = "SWITCH",
  CASE = "CASE",
  DEFAULT = "DEFAULT",

  PLUS = "+",
  MINUS = "-",
  STAR = "*",
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
