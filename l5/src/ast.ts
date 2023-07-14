import { L5InternalAssertion } from "./errors";
import { Token } from "./token";
import { INDENT, Maybe, flatten } from "./utils";

// TODO: Support constitutive rules
export type Stmt =
  | ConstitutiveDefinition
  | TypeDefinition
  | TypeInstancing
  | RelationalInstancing
  | RegulativeStmt;
export type Expression =
  | Literal
  | Identifier
  | RelationalIdentifier
  | ConstitutiveInvocation
  | ConditionalExpr
  | LogicalComposition
  | BinaryOp
  | UnaryOp;

// This expression will have to evaluate to boolean
export type BooleanExpression = Expression;
// An action returns a expression, if the expression is true
// the action is "taken", otherwise it is not "taken"
export type Action = BooleanExpression;
// This expression evaluates to a unit type
// BLAME [(expression)...]
export type UnitExpression = Expression;

export type PrimitiveType = number | boolean;
export class UnitLiteral {
  tag = "UnitLiteral";
  constructor(readonly typename: string, readonly instance: string) {}
}
export type LiteralType = PrimitiveType | UnitLiteral;

function indent(i: number): string {
  return INDENT.repeat(i);
}

export function map_to_tokens(
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
  return astlist.length == 0 ? [] : flatten(astlist.map((r) => r.src));
}

export interface AstNode {
  tag: string;
  toString(i?: number): string;
  debug(i?: number): string;
}

export interface AstNodeAnnotated extends AstNode {
  get src(): Token[];
}

export class Literal implements AstNodeAnnotated {
  tag = "Literal";
  constructor(readonly value: LiteralType, readonly _tokens: Token[]) {}
  toString = (i = 0): string => `${this.value}`;
  debug = (i = 0) => `${this.tag}[${this.value}]`;

  get src(): Token[] {
    return this._tokens;
  }
}

export class Identifier implements AstNodeAnnotated {
  tag = "Identifier";
  constructor(readonly identifier: string, readonly _tokens: Token[]) {}
  toString = (i = 0): string => `\`${this.identifier.toString()}\``;
  debug = (i = 0) => `${this.tag}[\`${this.identifier}\`]`;

  get src(): Token[] {
    return this._tokens;
  }
}

export class RelationalIdentifier implements AstNodeAnnotated {
  tag = "RelationalIdentifier";
  constructor(
    readonly template: string[],
    readonly instances: Identifier[],
    readonly _tokens: Token[]
  ) {}
  // TODO : Update toString and debug
  toString = (i = 0): string => "RelationalIdentifier";
  debug = (i = 0) => "RelationalIdentifier";

  get src(): Token[] {
    const toks = [list_to_tokens(this.instances), this._tokens];
    return flatten(toks);
  }
}

export class ConstitutiveInvocation implements AstNodeAnnotated {
  tag = "ConstitutiveInvocation";
  constructor(
    readonly func: Identifier,
    readonly args: Expression[],
    readonly _tokens: Token[]
  ) {}
  toString = (i = 0): string =>
    `${this.func}(${this.args.map((a) => a.toString()).join(",")})`;
  debug = (i = 0): string =>
    `${this.func.debug()}(${this.args.map((a) => a.debug()).join(",")})`;

  get src(): Token[] {
    const toks = [this.func.src, list_to_tokens(this.args), this._tokens];
    return flatten(toks);
  }
}

export class ConstitutiveDefinition implements AstNodeAnnotated {
  tag = "ConstitutiveDefinition";
  constructor(
    readonly constitutivelabel: Identifier,
    readonly params: Map<Identifier, Identifier>,
    readonly body: Expression,
    readonly _tokens: Token[]
  ) {}
  toString = (i = 0): string =>
    `DEFINE ${this.constitutivelabel.toString(i)} :: ${Array.from(
      this.params.entries()
    ).map(
      (p) => `${p[0].toString(i)}:${p[1].toString(i)}`
    )} -> ${this.body.toString(i)}`;
  debug = (i = 0) =>
    `DEFINE ${this.constitutivelabel.debug(i)} :: ${Array.from(
      this.params.entries()
    ).map((p) => `${p[0].debug(i)}:${p[1].debug(i)}`)} -> ${this.body.debug(
      i
    )}`;

  get src(): Token[] {
    const toks = [this.body.src, this._tokens];
    return flatten(toks);
  }
}

export class TypeDefinition implements AstNodeAnnotated {
  tag = "TypeDefinition";
  constructor(readonly typename: Identifier, readonly _tokens: Token[]) {}
  toString = (i = 0): string => `TYPE ${this.typename.toString(i)}`;
  debug = (i = 0): string => `TYPE ${this.typename.debug(i)}`;

  get src(): Token[] {
    const toks = [this.typename.src, this._tokens];
    return flatten(toks);
  }
}

export class TypeInstancing implements AstNodeAnnotated {
  tag = "TypeInstancing";
  constructor(
    readonly variable: Identifier,
    readonly typename: Identifier,
    readonly _tokens: Token[]
  ) {}
  toString = (i = 0): string =>
    `DECLARE ${this.variable.toString(i)} : ${this.typename.toString(i)}`;
  debug = (i = 0): string =>
    `DECLARE ${this.variable.debug(i)} : ${this.typename.debug(i)}`;

  get src(): Token[] {
    const toks = [this.variable.src, this.typename.src, this._tokens];
    return flatten(toks);
  }
}

export class RelationalInstancing implements AstNodeAnnotated {
  tag = "RelationalInstancing";
  constructor(
    readonly relation: RelationalIdentifier,
    readonly typename: Identifier,
    readonly value: Expression,
    readonly _tokens: Token[]
  ) {}
  toString = (i = 0): string =>
    `DECLARE ${this.relation.toString(i)} : ${this.typename.toString(
      i
    )} = ${this.value.toString(i)}`;
  debug = (i = 0): string =>
    `DECLARE ${this.relation.debug(i)} : ${this.typename.debug(
      i
    )} = ${this.value.debug(i)}`;

  get src(): Token[] {
    const toks = [
      this.relation.src,
      this.typename.src,
      this.value.src,
      this._tokens,
    ];
    return flatten(toks);
  }
}

export class RegulativeStmt implements AstNodeAnnotated {
  tag = "RegulativeStmt";
  constructor(
    readonly regulative_label: Identifier,
    // person:Person, petowner:PetOwner
    readonly args: Map<Identifier, Identifier>,
    readonly constraint: Maybe<Expression>,
    readonly deontic_temporal_action: Maybe<DeonticTemporalAction>,
    readonly regulative_rule_conclusions: RegulativeRuleConclusion[],
    // This identifies it as a tier1 or tier2 regulative rule
    readonly global: boolean,
    readonly _tokens: Token[]
  ) {}
  toString = (i = 0): string => {
    const lines = [];
    lines.push(
      `${this.global ? "$" : "*"} ${this.regulative_label.toString(
        i
      )} :: ${Array.from(this.args.entries())
        .map((p) => `${p[0].toString(i)}:${p[1].toString(i)}`)
        .join(",")}`
    );
    if (this.constraint != undefined)
      lines.push(indent(i) + this.constraint.toString(i));
    if (this.deontic_temporal_action != undefined)
      lines.push(indent(i) + this.deontic_temporal_action.toString(i));
    this.regulative_rule_conclusions.forEach((c) =>
      lines.push(indent(i) + c.toString(i))
    );
    return lines.join("\n");
  };
  debug = (i = 0): string => {
    const lines = [];
    lines.push(
      `${this.global ? "$" : "*"} ${this.regulative_label.debug(
        i
      )} :: ${Array.from(this.args.entries())
        .map((p) => `${p[0].debug(i)}:${p[1].debug(i)}`)
        .join(",")}`
    );
    if (this.constraint != undefined)
      lines.push(indent(i) + this.constraint.debug(i));
    if (this.deontic_temporal_action != undefined)
      lines.push(indent(i) + this.deontic_temporal_action.debug(i));
    this.regulative_rule_conclusions.forEach((c) =>
      lines.push(indent(i) + c.debug(i))
    );
    return lines.join("\n");
  };

  get src(): Token[] {
    const toks = [
      this.regulative_label.src,
      map_to_tokens(this.args),
      maybe_to_tokens(this.constraint),
      maybe_to_tokens(this.deontic_temporal_action),
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
  toString = (i = 0): string =>
    `${this.is_always ? "" : "ALWAYS"} ${this.op} ${this.action.toString(i)} ${
      this.temporal_constraint == undefined
        ? ""
        : this.temporal_constraint.toString(i)
    }} BLAME [${this.instance_tag.map((x) => x.toString(i)).join(",")}]`;
  debug = (i = 0) =>
    `${this.is_always ? "" : "ALWAYS"} ${this.op} ${this.action.debug(i)} ${
      this.temporal_constraint == undefined
        ? ""
        : this.temporal_constraint.debug(i)
    }} BLAME [${this.instance_tag.map((x) => x.debug(i)).join(",")}]`;

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

export class RelativeTime implements AstNodeAnnotated {
  tag = "RelativeTime";
  constructor(
    readonly ndays: Maybe<Literal>,
    readonly nmonths: Maybe<Literal>,
    readonly nyears: Maybe<Literal>,
    readonly _tokens: Token[]
  ) {}
  // TODO : Update toString and debug
  toString = (i = 0): string => "";
  debug = (i = 0) => "";

  get src(): Token[] {
    return this._tokens;
  }
}

export class AbsoluteTime implements AstNodeAnnotated {
  tag = "AbsoluteTime";
  constructor(
    readonly days: Literal,
    readonly months: Literal,
    readonly years: Literal,
    readonly _tokens: Token[]
  ) {}
  // TODO : Update toString and debug
  toString = (i = 0): string => "";
  debug = (i = 0) => "";

  get src(): Token[] {
    return this._tokens;
  }
}

export class TemporalConstraint implements AstNodeAnnotated {
  tag = "TemporalConstraint";
  constructor(
    readonly is_relative: boolean,
    readonly timestamp: RelativeTime | AbsoluteTime,
    readonly _tokens: Token[]
  ) {
    if (!(timestamp.tag == (is_relative ? "RelativeTime" : "AbsoluteTime"))) {
      throw new L5InternalAssertion(
        `is_relative=${is_relative} does not match with the given timestamp=${timestamp}` +
          `Expected to be handled within the parser`
      );
    }
  }
  // TODO : Update toString and debug
  toString = (i = 0): string => "";
  debug = (i = 0) => "";

  get src(): Token[] {
    return this._tokens;
  }
}

export class RevokeMarker implements AstNodeAnnotated {
  tag = "RevokeMarker";
  constructor(readonly _token: Token[]) {}
  toString = (i = 0): string => "?";
  debug = (i = 0) => "?";

  get src(): Token[] {
    return this._token;
  }
}

export class Mutation implements AstNodeAnnotated {
  tag = "Mutation";
  constructor(
    readonly id: RelationalIdentifier,
    readonly value: Expression | RevokeMarker
  ) {}
  // TODO : Update toString and debug
  toString = (i = 0): string => "";
  debug = (i = 0) => "";

  get src(): Token[] {
    const toks = [this.id.src, this.value.src];
    return flatten(toks);
  }
}

export class RegulativeRuleConclusion implements AstNodeAnnotated {
  tag = "RegulativeRuleConclusion";
  constructor(
    readonly fulfilled: Maybe<boolean>,
    readonly performed: Maybe<boolean>,
    readonly mutations: Mutation[],
    readonly conclusions: (RegulativeRuleInvocation | DeonticTemporalAction)[],
    readonly _tokens: Token[]
  ) {
    if (!(fulfilled == true || performed == true)) {
      throw new L5InternalAssertion(
        `RegulativeRuleConclusion requires one of fulfilled or performed! ` +
          `Expected to be handled within the parser`
      );
    }
    // TODO: Check that fulfilled and performed corresponds
    // to the presence of the constraint and action.
  }
  // TODO : Update toString and debug
  toString = (i = 0): string => "";
  debug = (i = 0) => "";

  get src(): Token[] {
    const toks = [
      list_to_tokens(this.mutations),
      list_to_tokens(this.conclusions),
      this._tokens,
    ];
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

export class ConditionalExpr implements AstNodeAnnotated {
  tag = "ConditionalExpr";
  constructor(
    readonly pred: Expression,
    readonly cons: Expression,
    readonly alt: Expression,
    readonly _tokens: Token[]
  ) {}
  toString = (i = 0): string =>
    `(${this.pred.toString(i)}) ? (${this.cons.toString(
      i
    )}) : (${this.alt.toString(i)})`;
  debug = (i = 0): string =>
    `(${this.pred.debug(i)}) ? (${this.cons.debug(i)}) : (${this.alt.debug(
      i
    )})`;

  get src(): Token[] {
    const toks = [this.pred.src, this.cons.src, this.alt.src, this._tokens];
    return flatten(toks);
  }
}

export abstract class AstTransformer {
  generic_transform(node: AstNode): AstNode {
    switch (node.tag) {
      case "Literal":
        return this.transform_Literal(node as Literal);
      case "Identifier":
        return this.transform_Identifier(node as Identifier);
      case "RelationalIdentifier":
        return this.transform_RelationalIdentifier(
          node as RelationalIdentifier
        );
      case "ConstitutiveInvocation":
        return this.transform_ConstitutiveInvocation(
          node as ConstitutiveInvocation
        );
      case "ConstitutiveDefinition":
        return this.transform_ConstitutiveDefinition(
          node as ConstitutiveDefinition
        );
      case "TypeDefinition":
        return this.transform_TypeDefinition(node as TypeDefinition);
      case "TypeInstancing":
        return this.transform_TypeInstancing(node as TypeInstancing);
      case "RelationalInstancing":
        return this.transform_RelationalInstancing(
          node as RelationalInstancing
        );
      case "RegulativeStmt":
        return this.transform_RegulativeStmt(node as RegulativeStmt);
      case "DeonticTemporalAction":
        return this.transform_DeonticTemporalAction(
          node as DeonticTemporalAction
        );
      case "RelativeTime":
        return this.transform_RelativeTime(node as RelativeTime);
      case "AbsoluteTime":
        return this.transform_AbsoluteTime(node as AbsoluteTime);
      case "TemporalConstraint":
        return this.transform_TemporalConstraint(node as TemporalConstraint);
      case "RevokeMarker":
        return this.transform_RevokeMarker(node as RevokeMarker);
      case "Mutation":
        return this.transform_Mutation(node as Mutation);
      case "RegulativeRuleConclusion":
        return this.transform_RegulativeRuleConclusion(
          node as RegulativeRuleConclusion
        );
      case "RegulativeRuleInvocation":
        return this.transform_RegulativeRuleInvocation(
          node as RegulativeRuleInvocation
        );
      case "LogicalComposition":
        return this.transform_LogicalComposition(node as LogicalComposition);
      case "BinaryOp":
        return this.transform_BinaryOp(node as BinaryOp);
      case "UnaryOp":
        return this.transform_UnaryOp(node as UnaryOp);
      case "ConditionalExpr":
        return this.transform_ConditionalExpr(node as ConditionalExpr);
      default:
        throw new L5InternalAssertion(
          `AstTransformer unhandled node: ${node.tag}`
        );
    }
  }

  transform_Literal(node: Literal) {
    return node;
  }
  transform_Identifier(node: Identifier) {
    return node;
  }
  transform_RelationalIdentifier(node: RelationalIdentifier) {
    return node;
  }
  transform_ConstitutiveInvocation(node: ConstitutiveInvocation) {
    return node;
  }
  transform_ConstitutiveDefinition(node: ConstitutiveDefinition) {
    return node;
  }
  transform_TypeDefinition(node: TypeDefinition) {
    return node;
  }
  transform_TypeInstancing(node: TypeInstancing) {
    return node;
  }
  transform_RelationalInstancing(node: RelationalInstancing) {
    return node;
  }
  transform_RegulativeStmt(node: RegulativeStmt) {
    return node;
  }
  transform_DeonticTemporalAction(node: DeonticTemporalAction) {
    return node;
  }
  transform_RelativeTime(node: RelativeTime) {
    return node;
  }
  transform_AbsoluteTime(node: AbsoluteTime) {
    return node;
  }
  transform_TemporalConstraint(node: TemporalConstraint) {
    return node;
  }
  transform_RevokeMarker(node: RevokeMarker) {
    return node;
  }
  transform_Mutation(node: Mutation) {
    return node;
  }
  transform_RegulativeRuleConclusion(node: RegulativeRuleConclusion) {
    return node;
  }
  transform_RegulativeRuleInvocation(node: RegulativeRuleInvocation) {
    return node;
  }
  transform_LogicalComposition(node: LogicalComposition) {
    return node;
  }
  transform_BinaryOp(node: BinaryOp) {
    return node;
  }
  transform_UnaryOp(node: UnaryOp) {
    return node;
  }
  transform_ConditionalExpr(node: ConditionalExpr) {
    return node;
  }
}
