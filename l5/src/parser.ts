import * as Ast from "./ast";
import { Token, TokenType } from "./token";
import { Maybe } from "./utils";

// Backtracking helper in case the syntax changes
function contextual(
  func: () => Maybe<Ast.AstNode>,
  parser: Parser
): Maybe<Ast.AstNode> {
  const wrapper = (parser: Parser): Maybe<Ast.AstNode> => {
    // Gets the starting position
    const start_position = parser.current;
    // Try to run the function
    const res = func() as Maybe<Ast.AstNode>;
    // If the function parses nothing, set the position back to
    // where it originally started
    if (res == undefined) {
      console.log(
        "backtracking at line: ",
        parser.current_token()?.line + " column: " + start_position
      );
      parser.set_position(start_position);
      // Signals that it has done badly
      return undefined;
    }
    // If the function parses well, update the end column
    // const end_position = parser.current;
    return res;
  };

  // Returnt he result of the wrapped function
  return wrapper(parser);
}

class Parser {
  current: number;
  tokens: Array<Token>;

  constructor(tokens: Array<Token>) {
    this.current = 0;
    this.tokens = tokens;

    this.statement = this.statement.bind(this);
    this.regulative_rule = this.regulative_rule.bind(this);
    // These are ConstDecls underneath the hood
    this.constitutive_definition = this.constitutive_definition.bind(this);
    this.expression_statement = this.expression_statement.bind(this);
    this.expression = this.expression.bind(this);
    // LogicalCompositions
    this.and_or = this.and_or.bind(this);
    this.comparison = this.comparison.bind(this);
    // BinaryOperators
    this.multiplication = this.multiplication.bind(this);
    this.addition = this.addition.bind(this);
    // UnaryOperators
    this.unary = this.unary.bind(this);
    this.call = this.call.bind(this);
    this.primitive = this.primitive.bind(this);
  }

  set_position(position: number) {
    this.current = position;
  }

  current_token(): Maybe<Token> {
    return this.tokens[this.current];
  }

  previous_token(): Maybe<Token> {
    return this.tokens[this.current - 1];
  }

  move() {
    this.current++;
  }

  match(token_type: TokenType): boolean {
    if (this.current < 0 || this.current >= this.tokens.length) {
      // console.error("match() out of bounds");
      return false;
    }

    const token = this.current_token();
    if (token == undefined) return false;
    if (token.token_type == token_type) {
      this.current++;
      return true;
    }
    return false;
  }

  match_multi(token_types: Array<TokenType>): boolean {
    if (this.current < 0 || this.current >= this.tokens.length) {
      return false;
    }

    const current_token = this.current_token();
    if (current_token == undefined) return false;
    for (const token_type of token_types) {
      if (token_type == current_token.token_type) {
        this.current++;
        return true;
      }
    }

    return false;
  }

  consume(token_type: TokenType, error: string) {
    const try_to_match = this.match(token_type);
    if (!try_to_match) {
      console.error(error);
      throw new Error(
        "expected " + token_type + " got: " + this.current_token()?.literal
      );
    }
  }

  consume_multi(token_types: Array<TokenType>, error: string) {
    const try_to_match = this.match_multi(token_types);
    if (!try_to_match) {
      console.error(error);
      throw new Error(
        "expected " + token_types + " got: " + this.current_token()?.literal
      );
    }
  }

  statement(): Maybe<Ast.Stmt> {
    if (this.match_multi([TokenType.DOLLAR, TokenType.STAR])) {
      return contextual(this.regulative_rule, this) as Ast.Stmt;
    }
    if (this.match(TokenType.DEFINE)) {
      return contextual(this.constitutive_definition, this) as Ast.Stmt;
    }

    return contextual(this.expression_statement, this) as Ast.Stmt;
  }

  regulative_rule(): Maybe<Ast.RegulativeStmt | Ast.Stmt> {
    const tier = this.previous_token() as Token;
    const global = tier.token_type == TokenType.DOLLAR ? true : false;

    this.consume_multi(
      [TokenType.BACKTICK_STRING, TokenType.IDENTIFIER],
      "Name of regulative rule should be in backticks or an identifier"
    );
    const regulative_label = this.previous_token() as Token;
  }

  constitutive_definition(): Maybe<Ast.ConsitutiveDefinition | Ast.Stmt> {}

  expression_statement(): Maybe<Ast.ExpressionStmt> {
    return new Ast.ExpressionStmt(
      contextual(this.expression, this) as Ast.Expression
    );
  }

  expression(): Maybe<Ast.Expression> {
    return contextual(this.and_or, this) as Ast.Expression;
  }

  and_or(): Maybe<Ast.LogicalComposition | Ast.Expression> {}

  comparison(): Maybe<Ast.BinaryOp | Ast.Expression> {}

  multiplication(): Maybe<Ast.BinaryOp | Ast.Expression> {}

  addition(): Maybe<Ast.BinaryOp | Ast.Expression> {}

  unary(): Maybe<Ast.UnaryOp | Ast.Expression> {}

  call(): Maybe<Ast.Literal | Ast.Call | Ast.Expression> {}

  primitive(): Maybe<Ast.Expression> {}
}
