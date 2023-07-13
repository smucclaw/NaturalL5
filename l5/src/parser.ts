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
      // console.log(
      //   "backtracking at line: ",
      //   parser.current_token()?.line + " column: " + start_position
      // );
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
    this.type_definition = this.type_definition.bind(this);
    this.type_instancing = this.type_instancing.bind(this);
    this.regulative_rule = this.regulative_rule.bind(this);

    this._deontic_temporal_action = this._deontic_temporal_action.bind(this);

    // Regulative Conclusions
    this._rule_conclusion = this._rule_conclusion.bind(this);
    this._rule_conclusion_fulfilled =
      this._rule_conclusion_fulfilled.bind(this);
    this._rule_conclusion_not_fulfilled =
      this._rule_conclusion_not_fulfilled.bind(this);
    this._rule_conclusion_performed =
      this._rule_conclusion_performed.bind(this);
    this._rule_conclusion_not_performed =
      this._rule_conclusion_not_performed.bind(this);
    this._rule_conclusion_fulfilled_performed =
      this._rule_conclusion_fulfilled_performed.bind(this);
    this._rule_conclusion_fulfilled_not_performed =
      this._rule_conclusion_fulfilled_not_performed.bind(this);
    this._rule_conclusion_not_fulfilled_performed =
      this._rule_conclusion_not_fulfilled_performed.bind(this);
    this._rule_conclusion_not_fulfilled_not_performed =
      this._rule_conclusion_not_fulfilled_not_performed.bind(this);

    this._n_mutation = this._n_mutation.bind(this);
    this._mutation = this._mutation.bind(this);
    this._n_conclusion = this._n_conclusion.bind(this);
    this._conclusion = this._conclusion.bind(this);

    // These are ConstDecls underneath the hood
    // this.constitutive_definition = this.constitutive_definition.bind(this);
    // this.expression_statement = this.expression_statement.bind(this);
    this.expression = this.expression.bind(this);

    // LogicalCompositions
    this.and_or = this.and_or.bind(this);
    this.comparison = this.comparison.bind(this);

    // BinaryOperators
    this.multiplication = this.multiplication.bind(this);
    this.addition = this.addition.bind(this);

    // UnaryOperators
    this.unary = this.unary.bind(this);
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

  consume_multi(token_types: TokenType[], error: string): Token {
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
    if (this.match(TokenType.TYPE)) {
      return contextual(this.type_definition, this) as Ast.Stmt;
    }

    if (this.match(TokenType.DEFINE)) {
      return contextual(this.type_instancing, this) as Ast.Stmt;
    }

    if (this.match_multi([TokenType.DOLLAR, TokenType.STAR])) {
      return contextual(this.regulative_rule, this) as Ast.Stmt;
    }

    // if (this.match(TokenType.DEFINE)) {
    //   return contextual(this.constitutive_definition, this) as Ast.Stmt;
    // }

    return undefined;
    // return contextual(this.expression_statement, this) as Ast.Stmt;
  }

  type_definition(): Maybe<Ast.TypeDefinition> {
    const type_token = this.previous_token() as Token;
    const type_name = this.consume(
      TokenType.IDENTIFIER,
      "Expected a name after TYPE"
    );

    return new Ast.TypeDefinition(
      new Ast.Identifier(type_name.literal, [type_name]),
      [type_token, type_name]
    );
  }

  type_instancing(): Maybe<Ast.TypeInstancing> {
    const define_token = this.previous_token() as Token;

    const variable_name = this.consume(
      TokenType.IDENTIFIER,
      "Expected an identifier name to be instanced to a type"
    );

    const colon = this.consume(
      TokenType.COLON,
      "Expected a colon after the identifier name"
    );

    const type_name = this.consume(
      TokenType.IDENTIFIER,
      "Expected a typename after colon"
    );

    return new Ast.TypeInstancing(
      new Ast.Identifier(variable_name.literal, [variable_name]),
      new Ast.Identifier(type_name.literal, [type_name]),
      [define_token, variable_name, colon, type_name]
    );
  }

  regulative_rule(): Maybe<Ast.RegulativeStmt | Ast.Stmt> {
    const tier = this.previous_token() as Token;
    const global = tier.token_type == TokenType.DOLLAR ? true : false;

    const regulative_label = this.consume_multi(
      [TokenType.BACKTICK_STRING, TokenType.QUOTED_STRING],
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
    const regulative_arguments = new Map<Ast.Identifier, Ast.Identifier>();
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
      regulative_arguments.set(
        new Ast.Identifier(instance_name.literal, [instance_name]),
        new Ast.Identifier(instance_type.literal, [instance_type])
      );
    } while (this.current_token()?.token_type == TokenType.COMMA);

    internal_assertion(() => {
      return regulative_arguments.size >= 1;
    }, "Regulative rules must have at least one instance");

    // Match for the constraints
    let constraints: Maybe<Ast.Expression> = undefined;
    if (this.match(TokenType.WHEN)) {
      constraints = contextual(this.expression, this) as Ast.Expression;
    }

    // Parse for the deontic temporal action here
    const deontic_temporal_action = contextual(
      this._deontic_temporal_action,
      this
    ) as Ast.DeonticTemporalAction;

    const regulative_rule_conclusions: Ast.RegulativeRuleConclusion[] = [];
    // There is a maximum of 4 different types of rule conclusion
    // TODO : Is there a way to check if a type of rule conclusion
    // has already been parsed
    // i.e.
    // parse: 1) IF FULFILLED AND PERFORMED
    // parse: 2) IF FULFILLED AND PERFORMED
    // This should not be allowed, one solution to this is to just
    // parse 4 of them, and do an assertion here
    // TODO : This should not be 4 but there could be more,
    // Could have cases where you just do IF FULFILLED
    // but I'm going to ignore those cases for now
    for (let i = 0; i < 8; i++) {
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
      console.log("@@@", regulative_rule_conclusions.length);
      for (let i = 0; i < regulative_rule_conclusions.length; i++) {
        console.log("###", regulative_rule_conclusions[i]?.conclusions.length);
        if (regulative_rule_conclusions[i]?.conclusions.length == 0)
          return false;
      }
      return true;
    }, "All Regulative Rule Conclusions must have a conclusion");

    return new Ast.RegulativeStmt(
      new Ast.Identifier(regulative_label.literal, [regulative_label]),
      regulative_arguments,
      constraints, // constraints
      deontic_temporal_action, // DeonticTemporalAction
      regulative_rule_conclusions,
      global,
      []
    );
  }

  _deontic_temporal_action(): Maybe<Ast.DeonticTemporalAction> {
    // Indicates where the start of the deontic tokens are
    const deontic_tokens_start = this.current;

    // Match if the deontic action has ALWAYS before it
    let always = false;
    if (this.match(TokenType.ALWAYS)) always = true;

    // Match for deontic temporal action
    // const deontic_permissibility = this.consume_multi(
    //   [TokenType.PERMITTED, TokenType.OBLIGATED],
    //   "A regulative rule must have a `PERMITTED` or a `OBLIGATED`"
    // );
    let deontic_permissibility = undefined;
    let deontic_permissibility_string: Ast.DeonticTemporalActionType;
    if (this.match_multi([TokenType.PERMITTED, TokenType.OBLIGATED])) {
      deontic_permissibility = this.previous_token() as Token;
      deontic_permissibility_string = this.convert_to_deontic_action_type(
        deontic_permissibility
      );
    } else {
      return undefined;
    }

    const deontic_action = contextual(this.expression, this) as Ast.Expression;

    // TODO : When temporals are better defined, then add this in
    // This matches for TokenType.UNTIL and TokenType.FOR
    const deontic_temporal = undefined;

    const deontic_blames: Ast.UnitExpression[] = [];
    if (this.match(TokenType.BLAME)) {
      if (this.match(TokenType.LEFT_BRACKET)) {
        while (!this.match(TokenType.RIGHT_BRACKET)) {
          deontic_blames.push(
            contextual(this.expression, this) as Ast.Expression
          );
        }
      } else {
        deontic_blames.push(
          contextual(this.expression, this) as Ast.Expression
        );
      }
    }

    // Indicates the end of the deontic tokens
    const deontic_tokens_end = this.current;

    return new Ast.DeonticTemporalAction(
      always,
      deontic_permissibility_string,
      deontic_action,
      deontic_temporal,
      deontic_blames,
      this.tokens.slice(deontic_tokens_start, deontic_tokens_end) // _tokens
    );
  }

  _rule_conclusion(): Maybe<Ast.RegulativeRuleConclusion> {
    // IF FULFILLED
    const f = contextual(
      this._rule_conclusion_fulfilled,
      this
    ) as Ast.RegulativeRuleConclusion;
    if (f != undefined) return f;

    // IF NOT FULFILLED
    const nf = contextual(
      this._rule_conclusion_not_fulfilled,
      this
    ) as Ast.RegulativeRuleConclusion;
    if (nf != undefined) return nf;

    // IF PERFORMED
    const p = contextual(
      this._rule_conclusion_performed,
      this
    ) as Ast.RegulativeRuleConclusion;
    if (p != undefined) return p;

    // IF NOT PERFORMED
    const np = contextual(
      this._rule_conclusion_not_performed,
      this
    ) as Ast.RegulativeRuleConclusion;
    if (np != undefined) return np;

    // IF FULFILLED AND PERFORMED
    const fp = contextual(
      this._rule_conclusion_fulfilled_performed,
      this
    ) as Ast.RegulativeRuleConclusion;
    if (fp != undefined) return fp;

    // IF FULFILLED AND NOT PERFORMED
    const fnp = contextual(
      this._rule_conclusion_fulfilled_not_performed,
      this
    ) as Ast.RegulativeRuleConclusion;
    if (fnp != undefined) return fnp;

    // IF NOT FULFILLED AND PERFORMED
    const nfp = contextual(
      this._rule_conclusion_not_fulfilled_performed,
      this
    ) as Ast.RegulativeRuleConclusion;
    if (nfp != undefined) return nfp;

    // IF NOT FULFILLED AND NOT PERFORMED
    const nfnp = contextual(
      this._rule_conclusion_not_fulfilled_not_performed,
      this
    ) as Ast.RegulativeRuleConclusion;
    if (nfnp != undefined) return nfnp;

    // There is nothing to parse for a rule_conclusion
    return undefined;
  }

  _rule_conclusion_fulfilled(): Maybe<Ast.RegulativeRuleConclusion> {
    // IF FULFILLED
    const f = this.current;
    if (this.match(TokenType.IF)) {
      if (this.match(TokenType.FULFILLED)) {
        const mutations = this._n_mutation();
        const conclusions = this._n_conclusion();
        return new Ast.RegulativeRuleConclusion(
          true,
          undefined,
          mutations,
          conclusions,
          this.tokens.slice(f, this.current)
        );
      }
    }
    return undefined;
  }

  _rule_conclusion_not_fulfilled(): Maybe<Ast.RegulativeRuleConclusion> {
    // IF NOT FULFILLED
    const nf = this.current;
    if (this.match(TokenType.IF)) {
      if (this.match(TokenType.NOT)) {
        if (this.match(TokenType.FULFILLED)) {
          const mutations = this._n_mutation();
          const conclusions = this._n_conclusion();
          return new Ast.RegulativeRuleConclusion(
            false,
            undefined,
            mutations,
            conclusions,
            this.tokens.slice(nf, this.current)
          );
        }
      }
    }
    return undefined;
  }

  _rule_conclusion_performed(): Maybe<Ast.RegulativeRuleConclusion> {
    // IF PERFORMED
    const p = this.current;
    if (this.match(TokenType.IF)) {
      if (this.match(TokenType.PERFORMED)) {
        const mutations = this._n_mutation();
        const conclusions = this._n_conclusion();
        return new Ast.RegulativeRuleConclusion(
          undefined,
          true,
          mutations,
          conclusions,
          this.tokens.slice(p, this.current)
        );
      }
    }
    return undefined;
  }

  _rule_conclusion_not_performed(): Maybe<Ast.RegulativeRuleConclusion> {
    // IF NOT PERFORMED
    const np = this.current;
    if (this.match(TokenType.IF)) {
      if (this.match(TokenType.NOT)) {
        if (this.match(TokenType.PERFORMED)) {
          const mutations = this._n_mutation();
          const conclusions = this._n_conclusion();
          return new Ast.RegulativeRuleConclusion(
            undefined,
            false,
            mutations,
            conclusions,
            this.tokens.slice(np, this.current)
          );
        }
      }
    }
    return undefined;
  }

  _rule_conclusion_fulfilled_performed(): Maybe<Ast.RegulativeRuleConclusion> {
    // IF     FULFILLED AND     PERFORMED
    const fp_start = this.current;
    if (this.match(TokenType.IF)) {
      if (this.match(TokenType.FULFILLED)) {
        if (this.match(TokenType.AND)) {
          if (this.match(TokenType.PERFORMED)) {
            const mutations = this._n_mutation();
            const conclusions = this._n_conclusion();
            return new Ast.RegulativeRuleConclusion(
              true,
              true,
              mutations,
              conclusions,
              this.tokens.slice(fp_start, this.current)
            );
          }
        }
      }
    }
    return undefined;
  }

  _rule_conclusion_fulfilled_not_performed(): Maybe<Ast.RegulativeRuleConclusion> {
    // IF NOT FULFILLED AND     PERFORMED
    const nfp_start = this.current;
    if (this.match(TokenType.IF)) {
      if (this.match(TokenType.NOT)) {
        if (this.match(TokenType.FULFILLED)) {
          if (this.match(TokenType.AND)) {
            if (this.match(TokenType.PERFORMED)) {
              const mutations = this._n_mutation();
              const conclusions = this._n_conclusion();
              return new Ast.RegulativeRuleConclusion(
                false,
                true,
                mutations,
                conclusions,
                this.tokens.slice(nfp_start, this.current)
              );
            }
          }
        }
      }
    }
    return undefined;
  }

  _rule_conclusion_not_fulfilled_performed(): Maybe<Ast.RegulativeRuleConclusion> {
    // IF     FULFILLED AND NOT PERFORMED
    const fnp_start = this.current;
    if (this.match(TokenType.IF)) {
      if (this.match(TokenType.FULFILLED)) {
        if (this.match(TokenType.AND)) {
          if (this.match(TokenType.NOT)) {
            if (this.match(TokenType.PERFORMED)) {
              const mutations = this._n_mutation();
              const conclusions = this._n_conclusion();
              return new Ast.RegulativeRuleConclusion(
                true,
                false,
                mutations,
                conclusions,
                this.tokens.slice(fnp_start, this.current)
              );
            }
          }
        }
      }
    }
    return undefined;
  }

  _rule_conclusion_not_fulfilled_not_performed(): Maybe<Ast.RegulativeRuleConclusion> {
    // IF NOT FULFILLED AND NOT PERFORMED
    const nfnp_start = this.current;
    if (this.match(TokenType.IF)) {
      if (this.match(TokenType.NOT)) {
        if (this.match(TokenType.FULFILLED)) {
          if (this.match(TokenType.AND)) {
            if (this.match(TokenType.NOT)) {
              if (this.match(TokenType.PERFORMED)) {
                const mutations = this._n_mutation();
                const conclusions = this._n_conclusion();
                return new Ast.RegulativeRuleConclusion(
                  true,
                  false,
                  mutations,
                  conclusions,
                  this.tokens.slice(nfnp_start, this.current)
                );
              }
            }
          }
        }
      }
    }

    return undefined;
  }

  _n_mutation(): Ast.Mutation[] {
    const mutations: Ast.Mutation[] = [];
    while (this.match(TokenType.QUOTED_STRING)) {
      const mutation = contextual(this._mutation, this) as Ast.Mutation;
      // If this isn't a mutation case anymore, just break and move on to conclusions
      if (mutation == undefined) break;
      mutations.push(mutation);
    }
    return mutations;
  }

  _mutation(): Maybe<Ast.Mutation> {
    // All mutations come first
    const mutation_start = this.current--;
    const quoted_string = this.previous_token();

    // this.consume(TokenType.EQUAL, "Must have equal in a mutation");
    if (!this.match(TokenType.EQUAL)) {
      return undefined;
    }
    // TODO : Handle REVOKE (?) in this scneario
    const expr = contextual(this.expression, this) as Ast.Expression;

    // TODO : Add in the handling of the templates here
    return new Ast.Mutation(
      new Ast.RelationalIdentifier(
        [],
        [],
        this.tokens.slice(mutation_start, this.current)
      ),
      expr
    );
  }

  _n_conclusion(): (
    | Ast.RegulativeRuleInvocation
    | Ast.DeonticTemporalAction
  )[] {
    const conclusions: (
      | Ast.RegulativeRuleInvocation
      | Ast.DeonticTemporalAction
    )[] = [];
    while (
      this.match_multi([
        TokenType.ALWAYS,
        TokenType.OBLIGATED,
        TokenType.PERMITTED,
        TokenType.BACKTICK_STRING,
      ])
    ) {
      const conclusion = contextual(this._conclusion, this) as
        | Ast.RegulativeRuleInvocation
        | Ast.DeonticTemporalAction;
      conclusions.push(conclusion);
    }
    return conclusions;
  }

  _conclusion(): Maybe<
    Ast.RegulativeRuleInvocation | Ast.DeonticTemporalAction
  > {
    const conclusion_start = this.current - 1;
    const previous_token = this.previous_token();

    // This is a RegulativeInvocation
    if (previous_token?.token_type == TokenType.BACKTICK_STRING) {
      this.consume(
        TokenType.LEFT_PAREN,
        "Expect a '(' for invoking a regulative rule"
      );
      const regulative_arguments: Ast.Expression[] = [];
      while (!this.match(TokenType.RIGHT_PAREN)) {
        regulative_arguments.push(
          contextual(this.expression, this) as Ast.Expression
        );
      }

      return new Ast.RegulativeRuleInvocation(
        new Ast.Identifier(previous_token.literal, [previous_token]),
        regulative_arguments,
        this.tokens.slice(conclusion_start, this.current)
      );
    } else {
      this.current--;
      const deontic_temporal_action = contextual(
        this._deontic_temporal_action,
        this
      ) as Ast.DeonticTemporalAction;
      return deontic_temporal_action;
    }

    return undefined;
  }

  // constitutive_definition(): Maybe<Ast.ConsitutiveDefinition | Ast.Stmt> {}

  expression(): Maybe<Ast.Expression> {
    return contextual(this.and_or, this) as Ast.Expression;
  }

  and_or(): Maybe<Ast.LogicalComposition | Ast.Expression> {
    const left_expr = contextual(this.comparison, this) as Ast.Expression;

    if (this.match_multi([TokenType.AND, TokenType.OR])) {
      const op = this.previous_token() as Token;
      const right_expr = contextual(this.comparison, this) as Ast.Expression;

      return new Ast.LogicalComposition(
        op?.literal == "AND" ? "AND" : "OR",
        left_expr,
        right_expr,
        [op]
      );
    }

    return left_expr;
  }

  comparison(): Maybe<Ast.BinaryOp | Ast.Expression> {
    return contextual(this.multiplication, this) as Ast.Expression;
  }

  multiplication(): Maybe<Ast.BinaryOp | Ast.Expression> {
    return contextual(this.addition, this) as Ast.Expression;
  }

  addition(): Maybe<Ast.BinaryOp | Ast.Expression> {
    return contextual(this.unary, this) as Ast.Expression;
  }

  unary(): Maybe<Ast.UnaryOp | Ast.Expression> {
    return contextual(this.primitive, this) as Ast.Expression;
  }

  primitive(): Maybe<Ast.Expression> {
    // OBLIGATED "{do this}"
    if (this.match(TokenType.QUOTED_STRING)) {
      const token = this.previous_token() as Token;
      return new Ast.Identifier(token.literal, [token]);
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = contextual(this.expression, this) as Ast.Expression;
      this.consume(TokenType.RIGHT_PAREN, "Expected a ')' after a '('");
      return expr;
    }

    if (this.match(TokenType.IDENTIFIER)) {
      const token = this.previous_token();
      if (token == undefined) return undefined;
      return new Ast.Identifier(token.literal, [token]);
    }

    return undefined;
  }

  program(): Ast.Stmt[] {
    const statements: Array<Ast.Stmt> = [];
    while (this.current != this.tokens.length) {
      const statement = contextual(this.statement, this) as Ast.Stmt;
      if (statement == undefined) {
        throw new Error("Not a statement");
        break;
      }
      statements.push(statement);
    }
    return statements;
  }
}

export function parse(tokens: Token[]): Ast.Stmt[] {
  const parser = new Parser(tokens);
  return parser.program();
}
