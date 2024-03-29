export enum TokenType {
  // Keywords
  PARTY = "PARTY",
  WHERE = "WHERE",
  WHEN = "WHEN",
  MUST = "MUST",
  MEANS = "MEANS",

  // Deontic actions
  // MUST | MAY can be lexed for future sugaring
  ALWAYS = "ALWAYS",
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
  BEFORE = "BEFORE",
  BEFORE_ON = "BEFORE_ON",
  AFTER = "AFTER",
  AFTER_ON = "AFTER_ON",
  ON = "ON",

  DAY = "DAY",
  MONTH = "MONTH",
  YEAR = "YEAR",

  // Action Duration
  UNTIL = "UNTIL",
  FOR = "FOR",
  BLAME = "BLAME",

  // Symbols
  ARROW = "->",
  LEFT_ARROW = "<",
  RIGHT_ARROW = ">",
  COLON = ":",
  DOUBLE_COLON = "::",
  SEMICOLON = ";",
  SINGLE_PIPE = "|",
  NOT = "!",
  DOLLAR = "$",
  PERCENT = "%",
  DOT = ".",
  COMMA = ",",
  BACKTICK = "`",
  LEFT_PAREN = "(",
  RIGHT_PAREN = ")",
  LEFT_BRACE = "{",
  RIGHT_BRACE = "}",
  LEFT_BRACKET = "[",
  RIGHT_BRACKET = "]",

  // Logical Comparisons
  EQUAL = "=",
  DOUBLE_EQUAL = "==",
  NOT_EQ = "!=",
  LT = "<",
  LT_EQ = "<=",
  GT = ">",
  GT_EQ = ">=",

  AND = "AND",
  OR = "OR",

  IDENTIFIER = "IDENTIFIER",
  BACKTICK_STRING = "BACKTICK_STRING",
  QUOTED_STRING = "QUOTED_STRING",

  // Literal types
  BOOL = "bool",
  INT = "int",
  FLOAT = "float",
  TRUE = "True",
  FALSE = "False",

  // Instancing syntax
  DECLARE = "DECLARE",

  // Declaring constitutive_definitions
  DEFINE = "DEFINE",

  // Type declaration
  TYPE = "TYPE",

  // Numbers
  NUMBER = "NUMBER",

  PLUS = "+",
  MINUS = "-",
  // Note that STAR will be double used for
  // private_regulative_rule and integers
  STAR = "*",
  SLASH = "/",

  COMMENT = "--",

  UNKNOWN = "",
}

export interface Token {
  token_type: TokenType;
  literal: string;
  line: number;
  begin_col: number;
  end_col: number;
}

export class TemplatedToken implements Token {
  constructor(
    readonly token_type: TokenType,
    readonly literal: string,
    readonly line: number,
    readonly begin_col: number,
    readonly end_col: number,
    readonly annotated_substrings: Token[],
    readonly annotated_string: string[],
    readonly annotated_expressions: Array<Token[]>
  ) {}
}
