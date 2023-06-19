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
    readonly callback_identifier: string
  ) {}

  toString = () => `User[${this.type}]`;
}

export class CompoundLiteral implements NonPrimitiveLiteral {
  constructor(readonly sym: string, readonly props: Map<string, Expression>) {}
  lookup(attrib: string): Maybe<Expression> {
    return this.props.get(attrib);
  }
  toString = () => {
    let propstr = "";
    this.props.forEach((v, k) => (propstr += `${k}:${v}; `));
    return `Compound[${this.sym}{${propstr}}]`;
  };
}

export class FunctionLiteral implements NonPrimitiveLiteral {
  constructor(readonly params: string[], readonly body: Block) {}
  toString = () => `(${this.params.join()}) => {${this.body}}`;
}

export class ResolvedFunctionLiteral implements NonPrimitiveLiteral {
  constructor(readonly params: ResolvedName[], readonly body: Block) {}
  toString = () => `(${this.params.join()}) => {${this.body}}`;
}

// This is created when a ConstDecl expression
// is packaged with its environment
export class Closure implements NonPrimitiveLiteral {
  constructor(
    readonly func: ResolvedFunctionLiteral,
    readonly env: Environment
  ) {}
  toString = () => `Closure[${this.func}]`;
}

export type LiteralType =
  | PrimitiveType
  | CompoundLiteral
  | UserInputLiteral
  | FunctionLiteral
  | ResolvedFunctionLiteral
  | Closure;

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
  | DelayedExpr
  | NoOpWrapper;

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
  toString = () => `Name[${this.sym}]`;
}

// Name gets converted into ResolvedName
// after the syntactic analysis pass
export class ResolvedName {
  tag = "ResolvedName";
  constructor(
    readonly sym: string,
    readonly env_pos: [number, number]
  ) {}
  toString = () =>
    `ResolvedName[${this.sym},(${this.env_pos[0]},${this.env_pos[1]})]`;
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

export class ExpressionStmt implements AstNode {
  tag = "ExpressionStmt";
  constructor(readonly expr: Expression) {}
  toString = (): string => `${this.expr};`;
}

export class Block implements AstNode {
  tag = "Block";
  constructor(readonly stmts: Stmt[]) {}
  toString = (): string =>
    `Block[\n${this.stmts.map((s) => "  " + s.toString()).join("\n")}\n]`;
}

export class ConstDecl implements AstNode {
  tag = "ConstDecl";
  constructor(readonly sym: string, readonly expr: Expression) {}
  toString = () => `var ${this.sym} = ${this.expr};`;
}

// ConstDecl gets converted into ResolvedConstDecl
// after the syntactic analysis pass
export class ResolvedConstDecl implements AstNode {
  tag = "ResolvedConstDecl";
  constructor(readonly sym: ResolvedName, readonly expr: Expression) {}
  toString = () => `var ${this.sym} = ${this.expr};`;
}

// DelayedExpr represents an expression that should
// be evaluated in environments above the current one.
export class DelayedExpr implements AstNode {
  tag = "DelayedExpr";
  constructor(readonly expr: Expression, readonly env: Environment) {}
  toString = () => `DelayedExpr[${this.expr}]`
}

// Only used to display purposes
export class NoOpWrapper implements AstNode {
  tag = "internal_NoOpWrapper";
  constructor(readonly towrap: AstNode) {}
  toString = () => `<${this.towrap}>`;
}
