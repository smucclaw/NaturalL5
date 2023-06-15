import {Maybe} from "./utils";

export type PrimitiveType = number | boolean;

// TODO: Further develop this type
export class UserInputLiteral {
  constructor(
    readonly type: "number" | "boolean",
    readonly callback: (agenda: AstNode) => PrimitiveType
  ) {}
  
  toString = () => `user:${this.type}`
}

export class CompoundLiteral {
  constructor(
    readonly sym: string,
    readonly props: Map<string, AstNode>
  ) {}
  lookup(attrib: string):Maybe<AstNode> {
    return this.props.get(attrib);
  }
  toString = () => {
    let propstr = "";
    this.props.forEach((v,k) => propstr += `${k}:${v}`)
    return `${this.sym}{${propstr}}`;
  }
}

export class FunctionLiteral {
  constructor(
    readonly sym: string,
    readonly params: string[],
    readonly body: AstNode
  ) {}
  toString = () => 
    `${this.sym}(${this.params.join()}){${this.body}}`
}

export type LiteralType =
  | PrimitiveType
  | CompoundLiteral
  | UserInputLiteral
  | FunctionLiteral;

// TODO: Add callbacks to get the value from the user

export interface AstNode {
  tag: string;
  toString(): string;
  // TODO
  // fromJson(...): AstNode;
}

// TODO: CompoundDeclaration for type checking.

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

export class Call implements AstNode {
  tag = "Call";
  constructor(readonly func: AstNode, readonly args: AstNode[]) {}
  toString = () => `${this.func}(${this.args.map(a => a.toString()).join()})`;
}

export type LogicalCompositionType = "&&" | "||";
export class LogicalComposition implements AstNode {
  tag = "LogicalComposition";
  constructor(
    readonly op: LogicalCompositionType,
    readonly first: AstNode,
    readonly second: AstNode
  ) {}
  toString = () => `(${this.first} ${this.op} ${this.second})`;
}

export type BinaryOpType = "+" | "-" | "*" | "%" | ">" | ">=" | "<" | "<=";
export class BinaryOp implements AstNode {
  tag = "BinaryOp";
  constructor(
    readonly op: BinaryOpType,
    readonly first: AstNode,
    readonly second: AstNode
  ) {}
  toString = () => `(${this.first} ${this.op} ${this.second})`;
}

export type UnaryOpType = "-" | "!";
export class UnaryOp implements AstNode {
  tag = "UnaryOp";
  constructor(readonly op: UnaryOpType, readonly first: AstNode) {}
  toString = () => `(${this.op}${this.first})`;
}

export class Sequential implements AstNode {
  tag = "Sequential";
  constructor(readonly stmts: AstNode[]) {}
  toString = () => `${this.stmts.map(s=>s.toString()).join(";")}`;
}

export class Block implements AstNode {
  tag = "Block";
  constructor(readonly body: AstNode) {}
  toString = () => `{${this.body}}`;
}

export class ConstDecl implements AstNode {
  tag = "ConstDecl";
  constructor(readonly sym: string, readonly expr: AstNode) {}
  toString = () => `const ${this.sym} = ${this.expr};`;
}

export class ConditionalExpr implements AstNode {
  tag = "ConditionalExpr";
  constructor(
    readonly pred: AstNode,
    readonly cons: AstNode,
    readonly alt: AstNode
  ) {}
  toString = () => `(${this.pred}) ? (${this.cons}) : (${this.alt})`;
}

export class AttributeAccess implements AstNode {
  tag = "AttributeAccess";
  constructor(readonly expr: AstNode, readonly attribute: string) {}
  toString = () => `(${this.expr}).${this.attribute}`
}
