import {
  AstNode,
  BinaryOp,
  Call,
  Closure,
  ConditionalExpr,
  Expression,
  Literal,
  LiteralType,
  ResolvedName,
  UserInputLiteral,
} from "./AstNode";
import { internal_assertion } from "./utils";

export type TraceNodeNames =
  | "TraceBinaryOp"
  | "TraceBinaryOp_value"
  | "TraceCall"
  | "TraceCall_value"
  | "TraceResovledName"
  | "TraceResovledName_value"
  | "TraceImplies"
  | "TraceImplies_value"
  | "TraceLiteral"
  | "TraceLiteral_value"
  | "TraceLogicalComposition"
  | "TraceLogicalComposition_value1"
  | "TraceLogicalComposition_value2"
  | "TraceUnaryOp"
  | "TraceUnaryOp_value"
  | "TraceAttributeAccess"
  | "TraceAttributeAccess_value"
  | "TraceResolvedName"
  | "TraceResolvedName_value";

export type TraceStack = TraceNodeNames | LiteralType | AstNode;

export interface TraceNode {
  readonly node: AstNode;
  readonly result: LiteralType;
  toString(i: number): string;
}

export class TraceBinaryOp implements TraceNode {
  constructor(
    readonly node: BinaryOp,
    readonly result: LiteralType,
    readonly first: TraceNode,
    readonly second: TraceNode
  ) {}
  toString = (i = 0): string =>
    `(${this.first.toString(i)} ${this.node.op} ${this.second.toString(i)}):${
      this.result
    }`;
}

export class TraceLiteral implements TraceNode {
  constructor(readonly node: Literal, readonly result: LiteralType) {}
  toString = (i = 0): string =>
    this.node.val instanceof UserInputLiteral
      ? `${this.node.toString(i)}:${this.result}`
      : this.node.val instanceof Closure
      ? `Closure:${this.result}`
      : `${this.result}`;
}

export class TraceResolvedName implements TraceNode {
  constructor(
    readonly node: ResolvedName,
    readonly result: LiteralType,
    readonly expr: TraceNode
  ) {}
  toString = (i = 0): string =>
    `[${this.node.sym}->${this.expr.toString(i)}]:${this.result}`;
}

export class TraceCall implements TraceNode {
  constructor(
    readonly node: Call,
    readonly result: LiteralType,
    readonly callexpr: TraceNode,
    readonly bodyexpr: TraceNode
  ) {}
  toString = (i = 0): string =>
    `[${this.callexpr.toString(i)}->${this.bodyexpr.toString(i)}]:${
      this.result
    }`;
}

export class TraceImplies implements TraceNode {
  constructor(
    readonly node: ConditionalExpr,
    readonly result: LiteralType,
    readonly pred: TraceNode,
    readonly taken: TraceNode
  ) {}
  toString = (i = 0): string =>
    `(${this.pred.toString(i)} => ${this.taken.toString(i)}):${this.result}`;
}

export function parse(tstack: TraceStack[]): TraceNode {
  const tag = tstack.pop();
  switch (tag) {
    case "TraceBinaryOp": {
      const node = tstack.pop() as BinaryOp;
      const first = parse(tstack);
      const second = parse(tstack);
      internal_assertion(
        () => tstack.pop() == "TraceBinaryOp_value",
        "Malformed trace"
      );
      const result = tstack.pop() as LiteralType;
      return new TraceBinaryOp(node, result, first, second);
    }
    case "TraceLiteral": {
      const node = tstack.pop() as Literal;
      const result = tstack.pop() as LiteralType;
      return new TraceLiteral(node, result);
    }
    case "TraceResolvedName": {
      const node = tstack.pop() as ResolvedName;
      const expr = parse(tstack);
      internal_assertion(
        () => tstack.pop() == "TraceResolvedName_value",
        "Malformed trace"
      );
      const result = tstack.pop() as LiteralType;
      return new TraceResolvedName(node, result, expr);
    }
    case "TraceCall": {
      const node = tstack.pop() as Call;
      const callexpr = parse(tstack);
      const bodyexpr = parse(tstack);
      internal_assertion(
        () => tstack.pop() == "TraceCall_value",
        "Malformed trace"
      );
      const result = tstack.pop() as LiteralType;
      return new TraceCall(node, result, callexpr, bodyexpr);
    }
    case "TraceImplies": {
      const node = tstack.pop() as ConditionalExpr;
      const pred = parse(tstack);
      const taken = parse(tstack);
      internal_assertion(
        () => tstack.pop() == "TraceImplies_value",
        "Malformed trace"
      );
      const result = tstack.pop() as LiteralType;
      return new TraceImplies(node, result, pred, taken);
    }
    default: {
      throw new Error(`Unhandled trace case ${tag}`);
    }
  }
}

export function parse_trace(tstack: TraceStack[]): TraceNode {
  return parse(tstack.reverse());
}

/*
(a+b)*2

(* (a+b) 2)
(* (+ a b) 2)
(* (+ a:5 b) 2)
(* (+ a:5 b:7) 2)
(* (+ a:5 b:7):12 2)
(* (+ a:5 b:7):12 2):24

(+ a b)
(+ a:10 b)
(+ a:10 b:20)
(+ a:10 b:20):30



uwu:[@, (a:10*2):20](a):100
*/
