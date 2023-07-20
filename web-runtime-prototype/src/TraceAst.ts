import {
  AstNode,
  AttributeAccess,
  BinaryOp,
  Call,
  Closure,
  CompoundLiteral,
  ConditionalExpr,
  Literal,
  LiteralType,
  LogicalComposition,
  ResolvedName,
  UnaryOp,
  UserInputLiteral,
} from "./AstNode";
import { INDENT, internal_assertion, peek } from "./utils";

export type TraceNodeNames =
  | ["TraceBinaryOp", BinaryOp]
  | ["TraceBinaryOp_value", LiteralType]
  | ["TraceCall", Call]
  | ["TraceCall_value", LiteralType]
  | ["TraceImplies", ConditionalExpr]
  | ["TraceImplies_value", LiteralType]
  | ["TraceLiteral", Literal, LiteralType]
  | ["TraceLogicalComposition", LogicalComposition]
  | ["TraceLogicalComposition_value1", LiteralType]
  | ["TraceLogicalComposition_value2", LiteralType]
  | ["TraceUnaryOp", UnaryOp]
  | ["TraceUnaryOp_value", LiteralType]
  | ["TraceAttributeAccess", AttributeAccess, string]
  | ["TraceAttributeAccess_value", LiteralType]
  | ["TraceResolvedName", ResolvedName]
  | ["TraceResolvedName_value", LiteralType]
  | "TraceCompoundLiteral"
  | ["TraceCompoundLiteral_attrib", string]
  | ["TraceCompoundLiteral_attribvalue", string, LiteralType]
  | ["TraceCompoundLiteral_value", CompoundLiteral];

export type TraceStack = TraceNodeNames;

export type TraceLiteralType = LiteralType | TraceCompoundLiteral;
type TLit = TraceLiteralType;

function TLit_str(tlit: TLit, i: number): string {
  return typeof tlit == "object"
    ? tlit instanceof Closure
      ? "CLOSURE"
      : tlit.toString(i)
    : `${tlit}`;
}

export class TraceAttribute {
  constructor(readonly trace: TraceNode, readonly result: TLit) {}
  toString(i = 0): string {
    return `${this.trace.toString(i)}`;
  }
}

export class TraceCompoundLiteral {
  constructor(
    readonly attributes: Map<string, TraceAttribute>,
    readonly result: CompoundLiteral
  ) {}
  toString(i = 0): string {
    const lines = [
      ["{"],
      Array.from(this.attributes.entries()).map(
        (v) => INDENT.repeat(i + 1) + `${v[0]}: ${v[1].toString(i + 1)}`
      ),
      [INDENT.repeat(i) + "}"],
    ].reduce((a, b) => a.concat(b));
    return lines.join("\n");
  }
}

export interface TraceNode {
  readonly node: AstNode;
  result: TLit;
  toString(i: number): string;
}

export class TraceBinaryOp implements TraceNode {
  constructor(
    readonly node: BinaryOp,
    public result: TLit,
    readonly first: TraceNode,
    readonly second: TraceNode
  ) {}
  toString = (i = 0): string =>
    `(${this.first.toString(i)} ${this.node.op} ${this.second.toString(
      i
    )}):${TLit_str(this.result, i)}`;
}

export class TraceLiteral implements TraceNode {
  constructor(readonly node: Literal, public result: TLit) {}
  toString = (i = 0): string =>
    this.node.val instanceof UserInputLiteral
      ? `${this.node.toString(i)}`
      : this.node.val instanceof Closure
      ? `Closure:${TLit_str(this.result, i)}`
      : `${TLit_str(this.result, i)}`;
}

export class TraceResolvedName implements TraceNode {
  constructor(
    readonly node: ResolvedName,
    public result: TLit,
    readonly expr: TraceNode
  ) {}
  toString = (i = 0): string => `${this.node.sym}->${TLit_str(this.result, i)}`;
}

export class TraceCall implements TraceNode {
  constructor(
    readonly node: Call,
    public result: TLit,
    readonly callexpr: TraceNode,
    readonly bodyexpr: TraceNode
  ) {}
  toString = (i = 0): string =>
    `[${this.callexpr.toString(i)} ::\n${INDENT.repeat(
      i + 1
    )}${this.bodyexpr.toString(i + 1)}]:${TLit_str(
      this.result,
      i + 1
    )}\n${INDENT.repeat(i)}`;
}

export class TraceImplies implements TraceNode {
  constructor(
    readonly node: ConditionalExpr,
    public result: TLit,
    readonly pred: TraceNode,
    readonly taken: TraceNode
  ) {}
  toString = (i = 0): string =>
    `(${this.pred.toString(i)} => \n${INDENT.repeat(
      i + 1
    )}${this.taken.toString(i + 1)}):${TLit_str(
      this.result,
      i
    )}\n${INDENT.repeat(i)}`;
}

export class TraceLogicalComposition implements TraceNode {
  constructor(
    readonly node: LogicalComposition,
    public result: TLit,
    readonly first: TraceNode,
    readonly second?: TraceNode
  ) {}
  toString = (i = 0): string =>
    `(${this.first.toString(i)} ${this.node.op} ${
      this.second == undefined ? "UNEVALUATED" : this.second.toString(i)
    }):${TLit_str(this.result, i)}`;
}

export class TraceUnaryOp implements TraceNode {
  constructor(
    readonly node: UnaryOp,
    public result: TLit,
    readonly first: TraceNode
  ) {}
  toString = (i = 0): string =>
    `(${this.node.op}${this.first.toString(i)}):${TLit_str(this.result, i)}`;
}

export class TraceAttributeAccess implements TraceNode {
  constructor(
    readonly node: AttributeAccess,
    public result: TLit,
    readonly attribname: string,
    readonly clitexpr: TraceNode,
    readonly attribexpr: TraceNode
  ) {}
  toString = (i = 0): string =>
    `(${this.clitexpr.toString(i)}).${this.attribname}:${TLit_str(
      this.result,
      i
    )}`;
}

export function parse(tstack: TraceStack[]): TraceNode {
  const tag = tstack.pop()!;
  switch (tag[0]) {
    case "TraceBinaryOp": {
      const node = tag[1] as BinaryOp;
      const first = parse(tstack);
      const second = parse(tstack);
      const [vtag, result] = tstack.pop()!;
      internal_assertion(
        () => vtag == "TraceBinaryOp_value",
        "Malformed trace"
      );
      return new TraceBinaryOp(node, result as TLit, first, second);
    }
    case "TraceLiteral": {
      const node = tag[1] as Literal;
      const result = tag[2] as TLit;
      return new TraceLiteral(node, result);
    }
    case "TraceResolvedName": {
      const node = tag[1] as ResolvedName;
      const expr = parse(tstack);
      const [vtag, result] = tstack.pop()!;
      internal_assertion(
        () => vtag == "TraceResolvedName_value",
        "Malformed trace"
      );
      return new TraceResolvedName(node, result as TLit, expr);
    }
    case "TraceCall": {
      const node = tag[1] as Call;
      const callexpr = parse(tstack);
      const bodyexpr = parse(tstack);
      const [vtag, result] = tstack.pop()!;
      internal_assertion(() => vtag == "TraceCall_value", "Malformed trace");
      return new TraceCall(node, result as TLit, callexpr, bodyexpr);
    }
    case "TraceImplies": {
      const node = tag[1] as ConditionalExpr;
      const pred = parse(tstack);
      const taken = parse(tstack);
      const [vtag, result] = tstack.pop()!;
      internal_assertion(() => vtag == "TraceImplies_value", "Malformed trace");
      return new TraceImplies(node, result as TLit, pred, taken);
    }
    case "TraceLogicalComposition": {
      const node = tag[1] as LogicalComposition;
      const first = parse(tstack);
      if (peek(tstack)[0] == "TraceLogicalComposition_value1") {
        const [_, result] = tstack.pop()!;
        return new TraceLogicalComposition(node, result as TLit, first);
      }
      const second = parse(tstack);
      const [vtag, result] = tstack.pop()!;
      internal_assertion(
        () => vtag == "TraceLogicalComposition_value2",
        "Malformed trace"
      );
      return new TraceLogicalComposition(node, result as TLit, first, second);
    }
    case "TraceUnaryOp": {
      const node = tag[1] as UnaryOp;
      const first = parse(tstack);
      const [vtag, result] = tstack.pop()!;
      internal_assertion(() => vtag == "TraceUnaryOp_value", "Malformed trace");
      return new TraceUnaryOp(node, result as TLit, first);
    }
    case "TraceAttributeAccess": {
      const node = tag[1] as AttributeAccess;
      const attribname = tag[2] as string;
      const clitexpr = parse(tstack);
      const attribexpr = parse(tstack);
      const [vtag, result] = tstack.pop()!;
      console.log(vtag, TLit_str(result as TLit, 0));
      internal_assertion(
        () => vtag == "TraceAttributeAccess_value",
        "Malformed trace"
      );
      return new TraceAttributeAccess(
        node,
        result as TLit,
        attribname,
        clitexpr,
        attribexpr
      );
    }
    default: {
      throw new Error(`Unhandled trace case ${tag}`);
    }
  }
}

function parse_compoundliteral(tstack: TraceStack[]): TraceCompoundLiteral {
  internal_assertion(
    () => tstack.pop() == "TraceCompoundLiteral",
    "Malformed trace"
  );

  const attributes = new Map<string, TraceAttribute>();
  while (peek(tstack)[0] != "TraceCompoundLiteral_value") {
    const [atag, attribname] = tstack.pop()!;
    internal_assertion(
      () => atag == "TraceCompoundLiteral_attrib",
      "Malformed trace"
    );
    const attrib = parse(tstack);
    if (peek(tstack) == "TraceCompoundLiteral") {
      attrib.result = parse_compoundliteral(tstack);
    }
    const [vtag, attribname2, attribvalue] = tstack.pop()!;
    internal_assertion(
      () =>
        vtag == "TraceCompoundLiteral_attribvalue" && attribname2 == attribname,
      "Malformed trace"
    );
    attributes.set(
      attribname as string,
      new TraceAttribute(attrib, attribvalue as LiteralType)
    );
  }

  const [_, result] = tstack.pop()!;
  return new TraceCompoundLiteral(attributes, result as CompoundLiteral);
}

export function parse_trace(tstack: TraceStack[]): TraceNode {
  tstack = tstack.reverse();
  const trace = parse(tstack);
  if (tstack.length == 0) return trace;

  internal_assertion(
    () => peek(tstack) == "TraceCompoundLiteral",
    "Malformed trace"
  );
  trace.result = parse_compoundliteral(tstack);
  return trace;
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
