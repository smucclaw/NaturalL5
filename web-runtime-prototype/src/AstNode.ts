import { Maybe } from "./utils";

export type PrimitiveType = number | boolean;

export interface NonPrimitiveLiteral {
  toString(): string;
}

// TODO: Further develop this type
export class UserInputLiteral implements NonPrimitiveLiteral {
  constructor(
    readonly type: "number" | "boolean",
    readonly callback: (agenda: AstNode) => PrimitiveType
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
  | GroupExpr;

export type Stmt =
  | ExpressionStmt
  | Sequential
  | Block
  | ConstDecl
  | ResolvedConstDecl;

export type LiteralType =
  | PrimitiveType
  | CompoundLiteral
  | UserInputLiteral
  | FunctionLiteral;

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
    readonly env_pos: [number, number]
  ) {
    super(sym);
  }
  override toString = () =>
    `${this.sym}%(${this.env_pos[0]},${this.env_pos[1]})`;
}

export class Call implements AstNode {
  tag = "Call";
  constructor(readonly func: AstNode, readonly args: AstNode[]) {}
  toString = () => `${this.func}(${this.args.map((a) => a.toString()).join()})`;
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

export type BinaryOpType = "+" | "-" | "*" | "%" | ">" | ">=" | "<" | "<=";
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
  toString = () => `${this.expr};`;
}

export class Sequential implements AstNode {
  tag = "Sequential";
  constructor(readonly stmts: AstNode[]) {}
  toString = () => `${this.stmts.map((s) => s.toString()).join(";")};`;
}

export class Block implements AstNode {
  tag = "Block";
  constructor(readonly body: AstNode) {}
  toString = () => `{${this.body}}`;
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
