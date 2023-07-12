import { Token } from "./token";
import { Maybe, INDENT } from "./utils";

export type Stmt = RegulativeStmt | ExpressionStmt | ConstDecl;
// | Block | ResolvedConstDecl;
export type Expression =
  // | Literal
  // | Name
  // | ResolvedName
  Call | LogicalComposition | BinaryOp | UnaryOp;
// | ConditionalExpr
// | AttributeAccess
// | DelayedExpr;

// This expression will have to evaluate to boolean
export type BooleanExpression = Expression;
// An action returns a expression, if the expression is "truthy"
// the action is "taken", if it is not "truthy", it is not "taken"
export type Action = BooleanExpression;
// TODO : When temporal constraints are defined with more concrete syntax,
// then this can be implemented
export type TemporalConstraint = Expression;
// BLAME [(expression)...]
export type InstanceExpression = Expression;
export type ConsitutiveDefinition = ConstDecl;

export interface AstNode {
  tag: string;
  toString(i?: number): string;
  debug(i?: number): string;
}

export interface AstNodeAnnotated extends AstNode {
  get src(): Token[];
}

export class RegulativeStmt implements AstNodeAnnotated {
  tag = "RegulativeStmt";
  constructor(
    readonly regulative_label: string,
    // person:Person, petowner:PetOwner
    readonly args: Map<string, string>,
    readonly constraints: Maybe<Expression>,
    readonly deontic_temporal_action: DeonticTemporalAction,
    readonly regulative_rule_conclusions: RegulativeRuleConclusion[],
    // This identifies it as a tier1 or tier2 regulative rule
    readonly global: boolean
  ) {}
  // TODO : Update toString and debug
  toString = (i = 0): string => `${this.regulative_label.toString()};`;
  debug = (i = 0) => `${this.regulative_label.toString()};`;

  get src(): Token[] {
    return [];
  }
}

export type DeonticTemporalActionType = "PERMITTED" | "OBLIGATED";
export class DeonticTemporalAction implements AstNodeAnnotated {
  tag = "DeonticTemporalAction";
  constructor(
    readonly op: DeonticTemporalActionType,
    readonly action: Action,
    readonly temporal_constraint: TemporalConstraint,
    readonly instance_tag: [InstanceExpression]
  ) {}
  // TODO : Update toString and debug
  toString = (i = 0): string => `${this.action.toString(i)};`;
  debug = (i = 0) => `${this.action.debug(i)};`;

  get src(): Token[] {
    return [];
  }
}

export class RegulativeRuleConclusion implements AstNodeAnnotated {
  tag = "RegulativeRuleConclusion";
  constructor(
    readonly fulfilled: boolean,
    readonly performed: boolean,
    readonly conclusions: (Call | DeonticTemporalAction)[]
  ) {}
  toString = (i = 0): string =>
    `{\n${this.conclusions
      .map((s) => INDENT.repeat(i + 1) + s.toString(i + 1))
      .join("\n")}\n${INDENT.repeat(i)}}`;
  debug = (i = 0): string =>
    `Block[\n${this.conclusions
      .map((s) => INDENT.repeat(i + 1) + s.debug(i + 1))
      .join("\n")}\n${INDENT.repeat(i)}]`;

  get src(): Token[] {
    return this.conclusions
      .map((s) => s.src as Token[])
      .reduce((a, b) => a.concat(b));
  }
}

export class RegulativeRuleInvocation implements AstNodeAnnotated {
  tag = "RegulativeRuleInvocation";
}

export class ExpressionStmt implements AstNodeAnnotated {
  tag = "ExpressionStmt";
  constructor(readonly expr: Expression) {}
  toString = (i = 0): string => `${this.expr.toString(i)};`;
  debug = (i = 0) => `${this.expr.debug(i)};`;

  get src(): Token[] {
    return this.expr.src;
  }
}

export class ConstDecl implements AstNodeAnnotated {
  tag = "ConstDecl";
  constructor(readonly sym_token: Token, readonly expr: Expression) {}
  toString = (i = 0) => `var ${this.sym} = ${this.expr.toString(i)};`;
  debug = (i = 0) => `var ${this.sym} = ${this.expr.debug(i)};`;

  get sym() {
    return this.sym_token.literal;
  }

  get src(): Token[] {
    return [this.sym_token].concat(this.expr.src);
  }
}

export class Call implements AstNodeAnnotated {
  tag = "Call";
  constructor(readonly func: Expression, readonly args: Expression[]) {}
  toString = (i = 0): string =>
    `${this.func.toString(i)}(${this.args.map((a) => a.toString(i)).join()})`;
  debug = (i = 0): string =>
    `${this.func.debug(i)}(${this.args.map((a) => a.debug(i)).join()})`;

  get src(): Token[] {
    return this.func.src.concat(
      this.args
        .map((a) => a.src as Token[])
        // "," arg
        .reduce((a, b) => a.concat(b))
    );
  }
}

export type LogicalCompositionType = "&&" | "||";
export class LogicalComposition implements AstNodeAnnotated {
  tag = "LogicalComposition";
  constructor(
    readonly op: LogicalCompositionType,
    readonly first: Expression,
    readonly second: Expression,
    readonly _op_src: Token
  ) {}
  toString = (i = 0): string =>
    `(${this.first.toString(i)} ${this.op} ${this.second.toString(i)})`;
  debug = (i = 0): string =>
    `(${this.first.debug(i)} ${this.op} ${this.second.debug(i)})`;

  get src(): Token[] {
    return this.first.src.concat([this._op_src]).concat(this.second.src);
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
    readonly _op_src: Token
  ) {}
  toString = (i = 0): string =>
    `(${this.first.toString(i)} ${this.op} ${this.second.toString(i)})`;
  debug = (i = 0): string =>
    `(${this.first.debug(i)} ${this.op} ${this.second.debug(i)})`;

  get src(): Token[] {
    return this.first.src.concat([this._op_src]).concat(this.second.src);
  }
}

export type UnaryOpType = "-" | "!";
export class UnaryOp implements AstNodeAnnotated {
  tag = "UnaryOp";
  constructor(
    readonly op: UnaryOpType,
    readonly first: Expression,
    readonly _op_src: Token
  ) {}
  toString = (i = 0): string => `(${this.op}${this.first.toString(i)})`;
  debug = (i = 0): string => `(${this.op}${this.first.debug(i)})`;

  get src(): Token[] {
    return [this._op_src].concat(this.first.src);
  }
}
