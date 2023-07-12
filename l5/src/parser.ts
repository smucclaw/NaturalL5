import * as Ast from "./ast";
import { Token, TokenType } from "./token";
import { Maybe, internal_assertion } from "./utils";

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
    // Regulative Conclusions
    this._rule_conclusion = this._rule_conclusion.bind(this);
    this._rule_conclusion_fulfilled_performed =
      this._rule_conclusion_fulfilled_performed.bind(this);
    this._rule_conclusion_fulfilled_not_performed =
      this._rule_conclusion_fulfilled_not_performed.bind(this);
    this._rule_conclusion_not_fulfilled_performed =
      this._rule_conclusion_not_fulfilled_performed.bind(this);
    this._rule_conclusion_not_fulfilled_not_performed =
      this._rule_conclusion_not_fulfilled_not_performed.bind(this);

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

  consume(token_type: TokenType, error: string): Token {
    const try_to_match = this.match(token_type);
    if (!try_to_match) {
      console.error(error);
      throw new Error(
        "expected " + token_type + " got: " + this.current_token()?.literal
      );
    }
    return this.previous_token() as Token;
  }

  consume_multi(token_types: Array<TokenType>, error: string): Token {
    const try_to_match = this.match_multi(token_types);
    if (!try_to_match) {
      console.error(error);
      throw new Error(
        "expected " + token_types + " got: " + this.current_token()?.literal
      );
    }
    return this.previous_token() as Token;
  }

  convert_to_deontic_action_type(token: Token): Ast.DeonticTemporalActionType {
    if (token.literal == "OBLIGATED") return "OBLIGATED";
    else if (token.literal == "PERMITTED") return "PERMITTED";

    throw new Error(
      "Couldn't match string to (OBLIGATED|PERMITTED) to convert to DeonticTemporalActionType"
    );
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

    const regulative_label = this.consume_multi(
      [TokenType.BACKTICK_STRING, TokenType.IDENTIFIER],
      "Name of regulative rule should be in backticks or an identifier"
    );

    this.consume(
      TokenType.DOUBLE_COLON,
      "Need a double colon after the regulative label"
    );

    // Match for instance_argument_label:instance_type
    // i.e. buyer:Person, seller:Person, third:Person
    // TODO : This should also parse same (buyer) same (seller)
    // This does not parse (buyer | seller) : Person
    const regulative_arguments = new Map<string, string>();
    do {
      const instance_name = this.consume(
        TokenType.IDENTIFIER,
        "Expected an instance argument label"
      );
      this.consume(
        TokenType.COLON,
        "Expected a ':' after the instance argument label"
      );
      const instance_type = this.consume(
        TokenType.IDENTIFIER,
        "Expected a type label"
      );
      regulative_arguments.set(instance_name.literal, instance_type.literal);
    } while (this.current_token()?.token_type == TokenType.COMMA);

    internal_assertion(() => {
      return regulative_arguments.size >= 1;
    }, "Regulative rules must have at least one instance");

    // Match for the constraints
    let constraints: Maybe<Ast.Expression> = undefined;
    if (this.match(TokenType.WHEN)) {
      constraints = contextual(this.expression, this) as Ast.Expression;
    }

    // Match for deontic temporal action
    const deontic_permissibility = this.consume_multi(
      [TokenType.PERMITTED, TokenType.OBLIGATED],
      "A regulative rule must have a `PERMITTED` or a `OBLIGATED`"
    );
    const deontic_permissibility_string = this.convert_to_deontic_action_type(
      deontic_permissibility
    );

    const deontic_action = contextual(this.expression, this) as Ast.Expression;

    // TODO : When temporals are better defined, then add this in
    // This matches for TokenType.UNTIL and TokenType.FOR
    const deontic_temporal = undefined;

    const deontic_blames = [];
    if (this.match(TokenType.BLAME)) {
      if (this.match(TokenType.LEFT_BRACKET)) {
        while (!this.match(TokenType.RIGHT_BRACKET)) {
          deontic_blames.push(contextual(this.expression, this));
        }
      } else {
        deontic_blames.push(contextual(this.expression, this));
      }
    }

    const deontic_temporal_action: Ast.DeonticTemporalAction =
      new Ast.DeonticTemporalAction(
        deontic_permissibility_string,
        deontic_action,
        deontic_temporal,
        deontic_blames
      );

    const regulative_rule_conclusions: Ast.RegulativeRuleConclusion[] = [];
    // There is a maximum of 4 different types of rule conclusion
    // TODO : Is there a way to check if a type of rule conclusion
    // has already been parsed
    // i.e.
    // parse: 1) IF FULFILLED AND PERFORMED
    // parse: 2) IF FULFILLED AND PERFORMED
    // This should not be allowed, one solution to this is to just
    // parse 4 of them, and do an assertion here
    for (let i = 0; i < 4; i++) {
      const conclusion = this._rule_conclusion();
      if (conclusion != undefined) regulative_rule_conclusions.push(conclusion);
    }

    // Just compare against every single conclusion and check
    internal_assertion(() => {
      for (let i = 0; i < regulative_rule_conclusions.length; i++) {
        for (let j = 0; j < regulative_rule_conclusions.length; j++) {
          if (i == j) continue;
          const x = regulative_rule_conclusions[i];
          const y = regulative_rule_conclusions[j];
          if (x?.fulfilled == y?.fulfilled && x?.performed == y?.performed) {
            return false;
          }
        }
      }
      return true;
    }, "Regulative Rule Conclusions must be unique.");

    // Check that for every regulative conclusion, there must be a conclusion
    internal_assertion(() => {
      for (let i = 0; i < regulative_rule_conclusions.length; i++) {
        if (regulative_rule_conclusions[i]?.conclusions.length == 0)
          return false;
      }
      return true;
    }, "All Regulative Rule Conclusions must have a conclusion");

    return new Ast.RegulativeStmt(
      regulative_label.literal,
      regulative_arguments,
      constraints, // constraints
      deontic_temporal_action, // DeonticTemporalAction
      regulative_rule_conclusions,
      global
    );
  }

  _rule_conclusion(): Maybe<Ast.RegulativeRuleConclusion> {
    // IF FULFILLED AND PERFORMED
    const fp = contextual(this._rule_conclusion_fulfilled_performed, this);
    if (fp != undefined) return fp;

    // IF FULFILLED AND NOT PERFORMED
    const fnp = contexutual(
      this._rule_conclusion_fulfilled_not_performed,
      this
    );
    if (fnp != undefined) return fnp;

    // IF NOT FULFILLED AND PERFORMED
    const nfp = contextual(this._rule_conclusion_not_fulfilled_performed, this);
    if (nfp != undefined) return nfp;

    // IF NOT FULFILLED AND NOT PERFORMED
    const nfnp = contextual(
      this._rule_conclusion_not_fulfilled_not_performed,
      this
    );
    if (nfnp != undefined) return nfnp;

    // There is nothing to parse for a rule_conclusion
    return undefined;
  }

  _rule_conclusion_fulfilled_performed(): Maybe<Ast.RegulativeRuleConclusion> {
    // IF     FULFILLED AND     PERFORMED
    // IF NOT FULFILLED AND     PERFORMED
    // IF     FULFILLED AND NOT PERFORMED
    // IF NOT FULFILLED AND NOT PERFORMED
    if (this.match(TokenType.IF)) {
      let performed = true;
      let fulfilled = true;

      if (this.match(TokenType.NOT)) performed = false;
      this.consume(TokenType.FULFILLED, "Expect a FULFILLED after IF (NOT)");

      this.consume(TokenType.AND, "Expect an AND");

      if (this.match(TokenType.NOT)) fulfilled = false;
      this.consume(TokenType.PERFORMED, "Expect a PERFORMED");
    }
  }
  _rule_conclusion_fulfilled_not_performed(): Maybe<Ast.RegulativeRuleConclusion> {}
  _rule_conclusion_not_fulfilled_performed(): Maybe<Ast.RegulativeRuleConclusion> {}
  _rule_conclusion_not_fulfilled_not_performed(): Maybe<Ast.RegulativeRuleConclusion> {}

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
