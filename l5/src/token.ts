enum TokenType {
  // Keywords
  PARTY = "PARTY",
  WHERE = "WHERE",
  MUST = "MUST",
  MEANS = "MEANS",

  // Deontic actions
  // MUST | MAY can be lexed for future sugaring
  OBLIGATED = "OBLIGATED",
  PERMITTED = "PERMITTED",

  FULFILLED = "FULFILLED",
  PERFORMED = "PERFORMED",

  // Control flow
  IF = "IF",
  THEN = "THEN",
  ELSE = "ELSE",
  QUESTION = "?",

  // Temporal constraints
  WITHIN = "WITHIN",
  BETWEEN = "BETWEEN",
  BEFORE = "BEFORE",
  BEFORE_ON = "BEFORE_ON",
  AFTER = "AFTER",
  AFTER_ON = "AFTER_ON",
  ON = "ON",

  // Actions & Types
  ACTION = "Action",
  LEFT_ARROW = "<",
  RIGHT_ARROW = ">",
  // Action Duration
  UNTIL = "UNTIL",
  FOR = "FOR",
  BLAME = "BLAME",

  // Symbols
  ARROW = "->",
  COLON = ":",
  DOUBLE_COLON = "::",
  SEMICOLON = ";",
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

  // Logical Comparisons
  EQUAL = "=",
  DOUBLE_EQUAL = "==",
  NOT_EQ = "!=",
  LT = "<",
  LT_EQ = "<=",
  GT = ">",
  GT_EQ = ">=",

  IDENTIFIER = "IDENTIFIER",

  // Literal types
  BOOL = "bool",
  INT = "int",
  FLOAT = "float",
  TRUE = "True",
  FALSE = "False",

  // Instancing syntax
  DECLARE = "declare",

  PLUS = "+",
  MINUS = "-",
  // Note that STAR will be double used for
  // private_regulative_rule and integers
  STAR = "*",
  SLASH = "/",

  COMMENT = "--",
}

type Token = {
  token_type: TokenType;
  literal: string;
  line: number;
  begin_col: number;
  end_col: number;
};

export { Token, TokenType };
