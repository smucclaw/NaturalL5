import * as Ast from "./ast";
import { ErrorContext, SourceAnnotation } from "./errors";
import { Token, TokenType } from "./token";
import { Maybe } from "./utils";
import { flatten } from "./utils";

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

  constructor(readonly tokens: Array<Token>, readonly errctx: ErrorContext) {
    this.current = 0;

    this.statement = this.statement.bind(this);
    this.type_definition = this.type_definition.bind(this);
    this.instancing = this.instancing.bind(this);
    this.constitutive_definition = this.constitutive_definition.bind(this);
    this.regulative_rule = this.regulative_rule.bind(this);

    this._deontic_temporal_action = this._deontic_temporal_action.bind(this);
    this._time_declaration = this._time_declaration.bind(this);
    this._absolute_time = this._absolute_time.bind(this);
    this._relative_time = this._relative_time.bind(this);

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

    // this.expression_statement = this.expression_statement.bind(this);
    this.expression = this.expression.bind(this);

    // ConditionalExpressions
    this.conditional = this.conditional.bind(this);

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
      const currtok = this.current_token() as Token;
      const errmsg = `${error}. Expected ${token_type}, got: '${currtok.literal}'`;
      throw this.errctx.createError(
        "SyntaxError",
        errmsg,
        new SourceAnnotation([currtok])
      );
    }
    return this.previous_token() as Token;
  }

  consume_multi(token_types: TokenType[], error: string): Token {
    const try_to_match = this.match_multi(token_types);
    if (!try_to_match) {
      const currtok = this.current_token()!;
      const errmsg = `${error}. Expected ${token_types}, got: '${currtok.literal}'`;
      throw this.errctx.createError(
        "SyntaxError",
        errmsg,
        new SourceAnnotation([currtok])
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

  convert_to_temporal_op_type(token: Token): Ast.TemporalOp {
    if (token.literal == "WITHIN") return "WITHIN";
    if (token.literal == "BEFORE") return "BEFORE";
    if (token.literal == "BEFORE_ON") return "BEFORE_ON";
    if (token.literal == "AFTER") return "AFTER";
    if (token.literal == "AFTER_ON") return "AFTER_ON";
    if (token.literal == "ON") return "ON";

    throw new Error(
      "Couldn't match string to (OBLIGATED|PERMITTED) to convert to DeonticTemporalActionType"
    );
  }

  statement(): Maybe<Ast.Stmt> {
    if (this.match(TokenType.TYPE)) {
      return contextual(this.type_definition, this) as Ast.Stmt;
    }

    if (this.match(TokenType.DECLARE)) {
      return contextual(this.instancing, this) as Ast.Stmt;
    }

    if (this.match(TokenType.DEFINE)) {
      return contextual(this.constitutive_definition, this) as Ast.Stmt;
    }

    if (this.match_multi([TokenType.DOLLAR, TokenType.STAR])) {
      return contextual(this.regulative_rule, this) as Ast.Stmt;
    }

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

  instancing(): Maybe<Ast.TypeInstancing | Ast.RelationalInstancing> {
    const define_token = this.previous_token() as Token;

    if (this.match_multi([TokenType.IDENTIFIER, TokenType.BACKTICK_STRING])) {
      const variable_name = this.previous_token() as Token;
      if (variable_name.token_type == TokenType.IDENTIFIER) {
        // Identifier path
        // DEFINE person:Person
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
      } else {
        // Backtick string
        // DEFINE `lkasjd`:int = 200
        const colon = this.consume(
          TokenType.COLON,
          "Expected a colon after the relational identifier name"
        );
        const type_name = this.consume_multi(
          [TokenType.INT, TokenType.BOOL],
          "Expected either a int or a bool after colon"
        );
        const equal = this.consume(
          TokenType.EQUAL,
          "Expected equal in a relational identifier definition"
        );
        const expr = contextual(this.expression, this) as Ast.Expression;
        // TODO : Sort out the tokens here
        const _tokens = [
          [define_token, variable_name, colon, type_name, equal],
          // expr._tokens,
        ];
        return new Ast.RelationalInstancing(
          // TODO : RelationalIdentifier data
          new Ast.RelationalIdentifier([], [], [variable_name]),
          new Ast.Identifier(type_name.literal, [type_name]),
          expr,
          flatten(_tokens)
        );
      }
    }
    return undefined;
  }

  constitutive_definition(): Maybe<Ast.ConstitutiveDefinition | Ast.Stmt> {
    const define = this.previous_token() as Token;
    const constitutive_label = this.consume(
      TokenType.BACKTICK_STRING,
      "Expected a constitutive label after DEFINE"
    );
    const semicolon = this.consume(
      TokenType.DOUBLE_COLON,
      "Expect double colons after DEFINE {constitutive_label}"
    );

    const constitutive_arguments = new Map<Ast.Identifier, Ast.Identifier>();
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
      constitutive_arguments.set(
        new Ast.Identifier(instance_name.literal, [instance_name]),
        new Ast.Identifier(instance_type.literal, [instance_type])
      );
    } while (this.match(TokenType.COMMA));

    this.consume(
      TokenType.ARROW,
      "Expect an arrow after constitutive labels and arguments"
    );

    const body = contextual(this.expression, this) as Ast.Expression;

    return new Ast.ConstitutiveDefinition(
      new Ast.Identifier(constitutive_label.literal, [constitutive_label]),
      constitutive_arguments,
      body,
      flatten([
        [define, constitutive_label, semicolon],
        Ast.map_to_tokens(constitutive_arguments),
      ])
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
    } while (this.match(TokenType.COMMA));

    if (regulative_arguments.size < 1)
      throw this.errctx.createError(
        "SyntaxError",
        "Regulative rules must have at least one instance"
      );

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
    regulative_rule_conclusions.forEach((c1, i) =>
      regulative_rule_conclusions.forEach((c2, j) => {
        if (i == j) return;
        if (!(c1.fulfilled == c2.fulfilled && c1.performed == c2.performed))
          return;
        throw this.errctx.createError(
          "SyntaxError",
          "Regulative Rule Conclusions must be unique.",
          new SourceAnnotation(c1.src.concat(c2.src))
        );
      })
    );

    // Check that for every regulative conclusion, there must be a conclusion
    regulative_rule_conclusions.forEach((c) => {
      if (c.conclusions.length > 0) return;
      throw this.errctx.createError(
        "SyntaxError",
        "All Regulative Rule Conclusions must have a conclusion",
        new SourceAnnotation(c.src)
      );
    });

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
    let deontic_temporal: Maybe<Ast.TemporalConstraint> = undefined;
    if (
      this.match_multi([
        TokenType.WITHIN,
        TokenType.BEFORE,
        TokenType.BEFORE_ON,
        TokenType.AFTER,
        TokenType.AFTER_ON,
        TokenType.ON,
      ])
    ) {
      const temporal_operator = this.previous_token() as Token;
      // const temporal_operator_type =
      const time_declaration = contextual(
        this._time_declaration,
        this
      ) as Maybe<Ast.AbsoluteTime | Ast.RelativeTime>;
      // TODO : Perhaps there is a better way to do error handling
      // more elegantly apart from like this
      if (time_declaration == undefined) {
        this.errctx.createError(
          "SyntaxError",
          "Expected a time declaration after a time keyword",
          new SourceAnnotation([temporal_operator])
        );
      }

      deontic_temporal = new Ast.TemporalConstraint(
        time_declaration?.tag == "RelativeTime" ? true : false,
        this.convert_to_temporal_op_type(temporal_operator),
        time_declaration as Ast.AbsoluteTime | Ast.RelativeTime,
        flatten([[temporal_operator], time_declaration?._tokens as Token[]])
      );
    }

    const deontic_blames: Ast.UnitExpression[] = [];
    if (this.match(TokenType.BLAME)) {
      if (this.match(TokenType.LEFT_BRACKET)) {
        // List of blame targets
        // [person, person]
        while (!this.match(TokenType.RIGHT_BRACKET)) {
          const instance_name = this.consume(
            TokenType.IDENTIFIER,
            "Expected an identifier to blame"
          );
          deontic_blames.push(
            new Ast.Identifier(instance_name.literal, [instance_name])
          );
          this.match(TokenType.COMMA);
        }
      } else {
        // Single blame target
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

  _time_declaration(): Maybe<Ast.AbsoluteTime | Ast.RelativeTime> {
    const absolute_time = contextual(
      this._absolute_time,
      this
    ) as Maybe<Ast.AbsoluteTime>;
    if (absolute_time != undefined) return absolute_time;

    const relative_time = contextual(
      this._relative_time,
      this
    ) as Maybe<Ast.RelativeTime>;
    if (relative_time != undefined) return relative_time;

    // Return an error, expected a time declaration after a time keyword
    // but did not receive a time declaration
    return undefined;
  }

  _absolute_time(): Maybe<Ast.AbsoluteTime> {
    // the format for absolute time is
    // dd/mm/yyyy
    if (this.match(TokenType.NUMBER)) {
      const days = this.previous_token() as Token;
      if (this.match(TokenType.SLASH)) {
        const first_slash = this.previous_token() as Token;
        // Once it reaches this state, it has to error out if it doesnt expect anything
        const months = this.consume(
          TokenType.NUMBER,
          "Expect number of month in an absolute time format"
        );
        const second_slash = this.consume(
          TokenType.SLASH,
          "Expect a slash after number of months in a absolute time format"
        );
        const years = this.consume(
          TokenType.NUMBER,
          "Expect number of years  in an absolute time format"
        );
        return new Ast.AbsoluteTime(
          new Ast.Literal(parseInt(days.literal), [days]),
          new Ast.Literal(parseInt(months.literal), [months]),
          new Ast.Literal(parseInt(years.literal), [years]),
          [days, first_slash, months, second_slash, years]
        );
      }
    }
    return undefined;
  }

  _relative_time(): Maybe<Ast.RelativeTime> {
    let no_days = 0;
    let days = undefined;
    const days_tokens = [];
    if (this.match(TokenType.NUMBER)) {
      days = this.previous_token() as Token;
      if (this.match(TokenType.DAY)) {
        no_days = parseInt(days.literal);
        days_tokens.push(days, this.previous_token() as Token);
      }
    }

    let no_months = 0;
    let months = undefined;
    const months_tokens = [];
    if (this.match(TokenType.NUMBER)) {
      months = this.previous_token() as Token;
      if (this.match(TokenType.MONTH)) {
        no_months = parseInt(months.literal);
        months_tokens.push(months, this.previous_token() as Token);
      }
    }

    let no_years = 0;
    let years = undefined;
    const years_tokens = [];
    if (this.match(TokenType.NUMBER)) {
      years = this.previous_token() as Token;
      if (this.match(TokenType.YEAR)) {
        no_years = parseInt(years.literal);
        years_tokens.push(years, this.previous_token() as Token);
      }
    }

    if (no_days != 0 || no_months != 0 || no_years != 0) {
      return new Ast.RelativeTime(
        days != undefined ? new Ast.Literal(no_days, [days]) : undefined,
        months != undefined ? new Ast.Literal(no_months, [months]) : undefined,
        years != undefined ? new Ast.Literal(no_years, [years]) : undefined,
        flatten([days_tokens, months_tokens, years_tokens])
      );
    }

    return undefined;
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

    if (this.match(TokenType.QUESTION)) {
      const revoke_marker = this.previous_token() as Token;
      return new Ast.Mutation(
        new Ast.RelationalIdentifier(
          [],
          [],
          this.tokens.slice(mutation_start, this.current)
        ),
        new Ast.RevokeMarker([revoke_marker]),
        [] // TODO
      );
    } else {
      const expr = contextual(this.expression, this) as Ast.Expression;
      // TODO : Add in the handling of the templates here
      return new Ast.Mutation(
        new Ast.RelationalIdentifier(
          [],
          [],
          this.tokens.slice(mutation_start, this.current)
        ),
        expr,
        [] // TODO
      );
    }
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
    return contextual(this.conditional, this) as Ast.Expression;
  }

  conditional(): Maybe<Ast.ConditionalExpr | Ast.Expression> {
    const pred = contextual(this.and_or, this) as Ast.Expression;

    if (this.match(TokenType.QUESTION)) {
      const question = this.previous_token() as Token;
      const cons = contextual(this.expression, this) as Ast.Expression;
      const colon = this.consume(
        TokenType.COLON,
        "Expect a : after a ternary operator"
      );
      const alt = contextual(this.expression, this) as Ast.Expression;
      return new Ast.ConditionalExpr(
        pred,
        cons,
        alt,
        flatten([pred._tokens, [question], cons._tokens, [colon], alt._tokens])
      );
    }

    return pred;
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
    return contextual(this.call, this) as Ast.Expression;
  }

  call(): Maybe<Ast.ConstitutiveInvocation | Ast.Expression> {
    const left_expr = contextual(this.primitive, this) as Ast.Expression;
    if (this.match(TokenType.LEFT_PAREN) && left_expr.tag == "Identifier") {
      const expr_arguments = [];
      while (!this.match(TokenType.RIGHT_PAREN)) {
        const expr = contextual(this.expression, this) as Ast.Expression;
        expr_arguments.push(expr);
        this.match(TokenType.COMMA);
      }
      return new Ast.ConstitutiveInvocation(
        left_expr as Ast.Identifier,
        expr_arguments,
        flatten([left_expr._tokens])
      );
    }
    return left_expr;
  }

  primitive(): Maybe<Ast.Expression> {
    // OBLIGATED "{do this}"
    if (this.match(TokenType.QUOTED_STRING)) {
      const token = this.previous_token() as Token;
      return new Ast.Identifier(token.literal, [token]);
    }

    if (this.match(TokenType.BACKTICK_STRING)) {
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

    if (this.match(TokenType.NUMBER)) {
      const token = this.previous_token();
      if (token == undefined) return undefined;
      return new Ast.Literal(parseInt(token.literal), [token]);
    }

    return undefined;
  }

  program(): Ast.Program {
    const statements: Array<Ast.Stmt> = [];
    while (this.current != this.tokens.length) {
      const statement = contextual(this.statement, this);
      if (statement == undefined) {
        throw this.errctx.createError(
          "SyntaxError",
          "Can't be parsed as a statement!",
          new SourceAnnotation([this.tokens[this.current]!])
        );
      }
      statements.push(statement as Ast.Stmt);
    }
    return new Ast.Program(statements);
  }
}

export function parse(tokens: Token[], errctx: ErrorContext): Ast.Program {
  const parser = new Parser(tokens, errctx);
  return parser.program();
}
