import { Token } from "./token";
import { Maybe, flatten, internal_assertion } from "./utils";

export type Stmt = RegulativeStmt;
  // | ConstitutiveRule
  // | TypeDefinition
  // | TypeInstancing
export type Expression =
  // | Literal
  // | RelationalIdentifier
  // | ConstitutiveRuleInvocation
  LogicalComposition | BinaryOp | UnaryOp;
  // | ConditionalExpr
  // | AttributeAccess
  // | DelayedExpr;

// This expression will have to evaluate to boolean
export type BooleanExpression = Expression;
// An action returns a expression, if the expression is "truthy"
// the action is "taken", if it is not "truthy", it is not "taken"
export type Action = BooleanExpression;
// This expression evaluates to a unit type
// BLAME [(expression)...]
export type UnitExpression = Expression;

export type LiteralType = number | boolean;
export type UnitType = string; // TODO create a class for this

function map_to_tokens(
  astmap: Map<AstNodeAnnotated, AstNodeAnnotated>
): Token[] {
  return flatten(
    Array.from(astmap.entries()).map((r) => r[0].src.concat(r[1].src))
  );
}

function maybe_to_tokens(astmaybe: Maybe<AstNodeAnnotated>) {
  return astmaybe == undefined ? [] : astmaybe.src;
}

function list_to_tokens(astlist: AstNodeAnnotated[]): Token[] {
  return flatten(astlist.map((r) => r.src));
}

export interface AstNode {
  tag: string;
  toString(i?: number): string;
  debug(i?: number): string;
}

export interface AstNodeAnnotated extends AstNode {
  get src(): Token[];
}

export class Identifier implements AstNodeAnnotated {
  tag = "Identifier";
  constructor(readonly identifier: string, readonly _tokens: Token[]) {}
  toString = (): string => `${this.identifier}`;
  debug = () => `${this.identifier}`;

  get src(): Token[] {
    return this._tokens;
  }
}

export class RegulativeStmt implements AstNodeAnnotated {
  tag = "RegulativeStmt";
  constructor(
    readonly regulative_label: Identifier,
    // person:Person, petowner:PetOwner
    readonly args: Map<Identifier, Identifier>,
    readonly constraint: Maybe<Expression>,
    readonly deontic_temporal_action: DeonticTemporalAction,
    readonly regulative_rule_conclusions: RegulativeRuleConclusion[],
    // This identifies it as a tier1 or tier2 regulative rule
    readonly global: boolean,
    readonly _tokens: Token[]
  ) {}
  // TODO : Update toString and debug
  toString = (i = 0): string => "";
  debug = (i = 0) => "";

  get src(): Token[] {
    const toks = [
      this.regulative_label.src,
      map_to_tokens(this.args),
      maybe_to_tokens(this.constraint),
      this.deontic_temporal_action.src,
      list_to_tokens(this.regulative_rule_conclusions),
      this._tokens,
    ];
    return flatten(toks);
  }
}

export type DeonticTemporalActionType = "PERMITTED" | "OBLIGATED";
export class DeonticTemporalAction implements AstNodeAnnotated {
  tag = "DeonticTemporalAction";
  constructor(
    readonly is_always: boolean,
    readonly op: DeonticTemporalActionType,
    readonly action: Action,
    readonly temporal_constraint: Maybe<TemporalConstraint>,
    readonly instance_tag: UnitExpression[],
    readonly _tokens: Token[]
  ) {}
  // TODO : Update toString and debug
  toString = (i = 0): string => "";
  debug = (i = 0) => "";

  get src(): Token[] {
    const toks = [
      this.action.src,
      maybe_to_tokens(this.temporal_constraint),
      list_to_tokens(this.instance_tag),
      this._tokens,
    ];
    return flatten(toks);
  }
}

// TODO create AstNodes for these
type RelativeTime = string;
type AbsoluteTime = string;

export class TemporalConstraint implements AstNodeAnnotated {
  tag = "TemporalConstraint";
  constructor(
    readonly is_relative: boolean,
    readonly timestamp: RelativeTime | AbsoluteTime,
    readonly _tokens: Token[]
  ) {
    // TODO: Make sure is_relative corresponds to timestamp given
  }
  // TODO : Update toString and debug
  toString = (i = 0): string => "";
  debug = (i = 0) => "";

  get src(): Token[] {
    return this._tokens;
  }

}

export class RegulativeRuleConclusion implements AstNodeAnnotated {
  tag = "RegulativeRuleConclusion";
  constructor(
    readonly fulfilled: Maybe<boolean>,
    readonly performed: Maybe<boolean>,
    readonly conclusions: (RegulativeRuleInvocation | DeonticTemporalAction)[],
    readonly _tokens: Token[]
  ) {
    internal_assertion(
      () => fulfilled == true || performed == true,
      `RegulativeRuleConclusion requires one of fulfilled or performed! ` +
        `Expected to be handled within the parser`
    );
    // TODO: Check that fulfilled and performed corresponds
    // to the presence of the constraint and action.
  }
  // TODO : Update toString and debug
  toString = (i = 0): string => "";
  debug = (i = 0) => "";

  get src(): Token[] {
    const toks = [list_to_tokens(this.conclusions), this._tokens];
    return flatten(toks);
  }
}

export class RegulativeRuleInvocation implements AstNodeAnnotated {
  tag = "RegulativeRuleInvocation";
  constructor(
    readonly regulative_label: Identifier,
    readonly args: Expression[],
    readonly _tokens: Token[]
  ) {}

  // TODO : Update toString and debug
  toString = (i = 0): string => "";
  debug = (i = 0) => "";

  get src(): Token[] {
    const toks = [
      this.regulative_label.src,
      list_to_tokens(this.args),
      this._tokens,
    ];
    return flatten(toks);
  }
}

export type LogicalCompositionType = "AND" | "OR";
export class LogicalComposition implements AstNodeAnnotated {
  tag = "LogicalComposition";
  constructor(
    readonly op: LogicalCompositionType,
    readonly first: Expression,
    readonly second: Expression,
    readonly _tokens: Token[]
  ) {}
  toString = (i = 0): string =>
    `(${this.first.toString(i)} ${this.op} ${this.second.toString(i)})`;
  debug = (i = 0): string =>
    `(${this.first.debug(i)} ${this.op} ${this.second.debug(i)})`;

  get src(): Token[] {
    const toks = [this.first.src, this.second.src, this._tokens];
    return flatten(toks);
  }
}

export type BinaryOpType =
  | "+"
  | "-"
  | "*"
  | "%"
  | "/"
  | ">"
  | ">="
  | "<"
  | "<="
  | "=="
  | "!=";
export class BinaryOp implements AstNodeAnnotated {
  tag = "BinaryOp";
  constructor(
    readonly op: BinaryOpType,
    readonly first: Expression,
    readonly second: Expression,
    readonly _tokens: Token[]
  ) {}
  toString = (i = 0): string =>
    `(${this.first.toString(i)} ${this.op} ${this.second.toString(i)})`;
  debug = (i = 0): string =>
    `(${this.first.debug(i)} ${this.op} ${this.second.debug(i)})`;

  get src(): Token[] {
    const toks = [this.first.src, this.second.src, this._tokens];
    return flatten(toks);
  }
}

export type UnaryOpType = "-" | "!";
export class UnaryOp implements AstNodeAnnotated {
  tag = "UnaryOp";
  constructor(
    readonly op: UnaryOpType,
    readonly first: Expression,
    readonly _tokens: Token[]
  ) {}
  toString = (i = 0): string => `(${this.op}${this.first.toString(i)})`;
  debug = (i = 0): string => `(${this.op}${this.first.debug(i)})`;

  get src(): Token[] {
    const toks = [this.first.src, this._tokens];
    return flatten(toks);
  }
}
