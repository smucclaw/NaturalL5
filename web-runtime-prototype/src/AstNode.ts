import { Environment } from "./Environment";
import { Maybe } from "./utils";

// TODO:
// Seperate AstNodes used for
// 1. Parsing
// 2. Synctatic Analysis
// 3. Evaluation

export type PrimitiveType = number | boolean | undefined;

export interface NonPrimitiveLiteral {
  toString(): string;
}

// TODO: Further develop this type
export class UserInputLiteral implements NonPrimitiveLiteral {
  constructor(
    readonly type: "number" | "boolean",
    readonly callback: (ctx: AstNode, env: Environment) => PrimitiveType
  ) {}

  toString = () => `user:${this.type}`;
}

export class CompoundLiteral implements NonPrimitiveLiteral {
  constructor(readonly sym: string, readonly props: Map<string, Expression>) {}
  lookup(attrib: string): Maybe<Expression> {
    return this.props.get(attrib);
  }
  toString = () => {
    let propstr = "";
    this.props.forEach((v, k) => (propstr += `${k}:${v}; `));
    return `${this.sym}{${propstr}}`;
  };
}

export class FunctionLiteral implements NonPrimitiveLiteral {
  constructor(readonly params: string[], readonly body: AstNode) {}
  toString = () => `(${this.params.join()}) => {${this.body}}`;
}

// This is created when a FunctionLiteral is ConstDecl-ared.
export class ClosureLiteral implements NonPrimitiveLiteral {
  constructor(readonly func: FunctionLiteral, readonly env: Environment) {}
  toString = () => `Closure[${this.func}]`;
}

export type LiteralType =
  | PrimitiveType
  | CompoundLiteral
  | UserInputLiteral
  | FunctionLiteral
  | ClosureLiteral;

export type Expression =
  | Literal
  | Name
  | ResolvedName
  | Call
  | LogicalComposition
  | BinaryOp
  | UnaryOp
  | ConditionalExpr
  | AttributeAccess
  | NoOpWrapper
  | GroupExpr;

export type Stmt = ExpressionStmt | Block | ConstDecl | ResolvedConstDecl;

export interface AstNode {
  tag: string;
  toString(): string;
  // TODO
  // fromJson(...): AstNode;
}

export class Literal implements AstNode {
  tag = "Literal";
  constructor(readonly val: LiteralType) {}
  toString = () => `${this.val}`;
}

export class Name implements AstNode {
  tag = "Name";
  constructor(readonly sym: string) {}
  toString = () => `${this.sym}`;
}

// Name gets converted into ResolvedName
// after the syntactic analysis pass
export class ResolvedName extends Name {
  override tag = "ResolvedName";
  constructor(
    override readonly sym: string,
    readonly env_pos: [number | "global", number]
  ) {
    super(sym);
  }
  override toString = () =>
    `${this.sym}%(${this.env_pos[0]},${this.env_pos[1]})`;
}

export class Call implements AstNode {
  tag = "Call";
  constructor(readonly func: Expression, readonly args: Expression[]) {}
  toString = (): string =>
    `${this.func}(${this.args.map((a) => a.toString()).join()})`;
}

export type LogicalCompositionType = "&&" | "||";
export class LogicalComposition implements AstNode {
  tag = "LogicalComposition";
  constructor(
    readonly op: LogicalCompositionType,
    readonly first: Expression,
    readonly second: Expression
  ) {}
  toString = () => `(${this.first} ${this.op} ${this.second})`;
}

export type BinaryOpType =
  | "+"
  | "-"
  | "*"
  | "%"
  | ">"
  | ">="
  | "<"
  | "<="
  | "=="
  | "!=";
export class BinaryOp implements AstNode {
  tag = "BinaryOp";
  constructor(
    readonly op: BinaryOpType,
    readonly first: Expression,
    readonly second: Expression
  ) {}
  toString = () => `(${this.first} ${this.op} ${this.second})`;
}

export type UnaryOpType = "-" | "!";
export class UnaryOp implements AstNode {
  tag = "UnaryOp";
  constructor(readonly op: UnaryOpType, readonly first: Expression) {}
  toString = () => `(${this.op}${this.first})`;
}

export class ConditionalExpr implements AstNode {
  tag = "ConditionalExpr";
  constructor(
    readonly pred: Expression,
    readonly cons: Expression,
    readonly alt: Expression
  ) {}
  toString = () => `(${this.pred}) ? (${this.cons}) : (${this.alt})`;
}

export class AttributeAccess implements AstNode {
  tag = "AttributeAccess";
  constructor(readonly expr: Expression, readonly attribute: string) {}
  toString = () => `(${this.expr}).${this.attribute}`;
}

export class GroupExpr implements AstNode {
  tag = "GroupExpr";
  constructor(readonly expr: Expression) {}
  toString = () => `(${this.expr})`;
}

export class ExpressionStmt implements AstNode {
  tag = "ExpressionStmt";
  constructor(readonly expr: Expression) {}
  toString = (): string => `${this.expr};`;
}

export class Block implements AstNode {
  tag = "Block";
  constructor(readonly stmts: Stmt[]) {}
  toString = (): string => `${this.stmts.map((s) => s.toString()).join(";")};`;
}

export class ConstDecl implements AstNode {
  tag = "ConstDecl";
  constructor(readonly sym: string, readonly expr: Expression) {}
  toString = () => `const ${this.sym} = ${this.expr};`;
}

// ConstDecl gets converted into ResolvedConstDecl
// after the syntactic analysis pass
export class ResolvedConstDecl implements AstNode {
  tag = "ResolvedConstDecl";
  constructor(readonly sym: ResolvedName, readonly expr: Expression) {}
  toString = () => `const ${this.sym} = ${this.expr};`;
}

// Only used to display purposes
export class NoOpWrapper implements AstNode {
  tag = "internal_NoOpWrapper";
  constructor(readonly towrap: AstNode) {}
  toString = () => `<${this.towrap}>`;
}
