import { Environment } from "./Environment";
import { Maybe, INDENT } from "./utils";

// TODO:
// Seperate AstNodes used for
// 1. Parsing
// 2. Synctatic Analysis
// 3. Evaluation

export type PrimitiveType = number | boolean | undefined;

export interface NonPrimitiveLiteral {
  toString(i: number): string;
  debug(i: number): string;
}

// TODO: Further develop this type
export class UserInputLiteral implements NonPrimitiveLiteral {
  constructor(
    readonly type: "number" | "boolean",
    readonly callback_identifier: string
  ) {}

  debug = () => `User[${this.type}, "${this.callback_identifier}"]`;
  toString = this.debug;
}

export class CompoundLiteral implements NonPrimitiveLiteral {
  constructor(readonly sym: string, readonly props: Map<string, Expression>) {}
  lookup(attrib: string): Maybe<Expression> {
    return this.props.get(attrib);
  }
  toString = (i = 0) => {
    let propstr = "";
    this.props.forEach((v, k) => (propstr += `${k}:${v.toString(i)}; `));
    return `Compound[${this.sym}{${propstr}}]`;
  };
  debug = (i = 0) => {
    let propstr = "";
    this.props.forEach((v, k) => (propstr += `${k}:${v.debug(i)}; `));
    return `Compound[${this.sym}{${propstr}}]`;
  };
}

export class FunctionLiteral implements NonPrimitiveLiteral {
  constructor(readonly params: string[], readonly body: Block) {}
  toString = (i = 0) => `(${this.params.join()}) => {${this.body.toString(i)}}`;
  debug = (i = 0) => `(${this.params.join()}) => {${this.body.debug(i)}}`;
}

export class ResolvedFunctionLiteral implements NonPrimitiveLiteral {
  constructor(readonly params: ResolvedName[], readonly body: Block) {}
  toString = (i = 0) => `(${this.params.join()}) => {${this.body.toString(i)}}`;
  debug = (i = 0) => `(${this.params.join()}) => {${this.body.debug(i)}}`;
}

// This is created when a ConstDecl expression
// is packaged with its environment
export class Closure implements NonPrimitiveLiteral {
  constructor(
    readonly func: ResolvedFunctionLiteral,
    readonly env: Environment
  ) {}
  toString = (i: number) => `${this.func.toString(i)}`;
  debug = (i: number) => `Closure[${this.func.debug(i)}]`;
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
  toString(i?: number): string;
  debug(i?: number): string;
  // TODO
  // fromJson(...): AstNode;
}

export class Literal implements AstNode {
  tag = "Literal";
  constructor(readonly val: LiteralType) {}
  toString = (i = 0) =>
    `${typeof this.val == "object" ? this.val.toString(i) : this.val}`;
  debug = (i = 0) =>
    `${typeof this.val == "object" ? this.val.debug(i) : this.val}`;
}

export class Name implements AstNode {
  tag = "Name";
  constructor(readonly sym: string) {}
  toString = () => this.sym;
  debug = () => `Name[${this.sym}]`;
}

// Name gets converted into ResolvedName
// after the syntactic analysis pass
export class ResolvedName {
  tag = "ResolvedName";
  constructor(readonly sym: string, readonly env_pos: [number, number]) {}
  toString = () => this.sym;
  debug = () =>
    `ResolvedName[${this.sym},(${this.env_pos[0]},${this.env_pos[1]})]`;
}

export class Call implements AstNode {
  tag = "Call";
  constructor(readonly func: Expression, readonly args: Expression[]) {}
  toString = (i = 0): string =>
    `${this.func.toString(i)}(${this.args.map((a) => a.toString(i)).join()})`;
  debug = (i = 0): string =>
    `${this.func.debug(i)}(${this.args.map((a) => a.debug(i)).join()})`;
}

export type LogicalCompositionType = "&&" | "||";
export class LogicalComposition implements AstNode {
  tag = "LogicalComposition";
  constructor(
    readonly op: LogicalCompositionType,
    readonly first: Expression,
    readonly second: Expression
  ) {}
  toString = (i = 0): string =>
    `(${this.first.toString(i)} ${this.op} ${this.second.toString(i)})`;
  debug = (i = 0): string =>
    `(${this.first.debug(i)} ${this.op} ${this.second.debug(i)})`;
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
export class BinaryOp implements AstNode {
  tag = "BinaryOp";
  constructor(
    readonly op: BinaryOpType,
    readonly first: Expression,
    readonly second: Expression
  ) {}
  toString = (i = 0): string =>
    `(${this.first.toString(i)} ${this.op} ${this.second.toString(i)})`;
  debug = (i = 0): string =>
    `(${this.first.debug(i)} ${this.op} ${this.second.debug(i)})`;
}

export type UnaryOpType = "-" | "!";
export class UnaryOp implements AstNode {
  tag = "UnaryOp";
  constructor(readonly op: UnaryOpType, readonly first: Expression) {}
  toString = (i = 0): string => `(${this.op}${this.first.toString(i)})`;
  debug = (i = 0): string => `(${this.op}${this.first.debug(i)})`;
}

export class ConditionalExpr implements AstNode {
  tag = "ConditionalExpr";
  constructor(
    readonly pred: Expression,
    readonly cons: Expression,
    readonly alt: Expression
  ) {}
  toString = (i = 0): string =>
    `(${this.pred.toString(i)}) ? (${this.cons.toString(
      i
    )}) : (${this.alt.toString(i)})`;
  debug = (i = 0): string =>
    `(${this.pred.debug(i)}) ? (${this.cons.debug(i)}) : (${this.alt.debug(
      i
    )})`;
}

export class AttributeAccess implements AstNode {
  tag = "AttributeAccess";
  constructor(readonly expr: Expression, readonly attribute: string) {}
  toString = (i = 0): string => `(${this.expr.toString(i)}).${this.attribute}`;
  debug = (i = 0): string => `(${this.expr.debug(i)}).${this.attribute}`;
}

export class ExpressionStmt implements AstNode {
  tag = "ExpressionStmt";
  constructor(readonly expr: Expression) {}
  toString = (i = 0): string => `${this.expr.toString(i)};`;
  debug = (i = 0) => `${this.expr.debug(i)};`;
}

export class Block implements AstNode {
  tag = "Block";
  constructor(readonly stmts: Stmt[]) {}
  toString = (i = 0): string =>
    `{\n${this.stmts
      .map((s) => INDENT.repeat(i + 1) + s.toString(i + 1))
      .join("\n")}\n${INDENT.repeat(i)}}`;
  debug = (i = 0): string =>
    `Block[\n${this.stmts
      .map((s) => INDENT.repeat(i + 1) + s.debug(i + 1))
      .join("\n")}\n${INDENT.repeat(i)}]`;
}

export class ConstDecl implements AstNode {
  tag = "ConstDecl";
  constructor(readonly sym: string, readonly expr: Expression) {}
  toString = (i = 0) => `var ${this.sym} = ${this.expr.toString(i)};`;
  debug = (i = 0) => `var ${this.sym} = ${this.expr.debug(i)};`;
}

// ConstDecl gets converted into ResolvedConstDecl
// after the syntactic analysis pass
export class ResolvedConstDecl implements AstNode {
  tag = "ResolvedConstDecl";
  constructor(readonly sym: ResolvedName, readonly expr: Expression) {}
  toString = (i = 0) => `var ${this.sym} = ${this.expr.toString(i)};`;
  debug = (i = 0) => `var ${this.sym} = ${this.expr.debug(i)};`;
}

// DelayedExpr represents an expression that should
// be evaluated in environments above the current one.
export class DelayedExpr implements AstNode {
  tag = "DelayedExpr";
  constructor(readonly expr: Expression, readonly env: Environment) {}
  toString = (i = 0): string => `${this.expr.toString(i)}`;
  debug = (i = 0): string => `DelayedExpr[${this.expr.debug(i)}]`;
}

// Only used to display purposes
export class NoOpWrapper implements AstNode {
  tag = "internal_NoOpWrapper";
  constructor(readonly towrap: AstNode) {}
  toString = (i = 0) => `<${this.towrap.toString(i)}>`;
  debug = (i = 0) => `<${this.towrap.debug(i)}>`;
}
