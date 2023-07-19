import { Environment } from "./Environment";
import { Token } from "./Token";
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

  get src(): Token[];
}

// TODO: Further develop this type
export class UserInputLiteral implements NonPrimitiveLiteral {
  constructor(
    readonly type: "number" | "boolean",
    readonly callback_identifier: string, // All the tokens associated with this userinput
    readonly _src_question: Token,
    public cache: LiteralType = undefined,
    public is_valid = false
  ) {}

  debug = () =>
    `User[${this.type}, "${this.callback_identifier}", val=${this.cache}, valid=${this.is_valid}]`;
  toString = () =>
    `User[${this.type}, "${this.callback_identifier}", val=${this.cache}]`;

  get src() {
    return [this._src_question];
  }
}

export class CompoundLiteral implements NonPrimitiveLiteral {
  constructor(
    readonly sym_token: Token,
    readonly props: Map<string, Expression>,
    readonly prop_tokens: Token[]
  ) {}

  lookup(attrib: string): Maybe<Expression> {
    return this.props.get(attrib);
  }

  set(attrib: string, item: Expression) {
    this.props.set(attrib, item);
  }

  toString = (i = 0) => {
    let propstr = "";
    const pind = INDENT.repeat(i);
    const ind = INDENT.repeat(i + 1);
    this.props.forEach(
      (v, k) => (propstr += `${ind}${k}: ${v.toString(i + 1)};\n`)
    );
    return `${this.sym}{\n${propstr}${pind}}`;
  };

  debug = (i = 0) => {
    let propstr = "";
    const pind = INDENT.repeat(i);
    const ind = INDENT.repeat(i + 1);
    this.props.forEach((v, k) => (propstr += `${ind}${k}: ${v.debug(i)};\n`));
    return `Compound[${this.sym}{\n${propstr}${pind}}]`;
  };

  get sym() {
    return this.sym_token.literal;
  }

  get src() {
    return this.prop_tokens
      .map((p) => [p].concat(this.props.get(p.literal)!.src))
      .reduce((a, b) => a.concat(b));
  }
}

export class FunctionLiteral implements NonPrimitiveLiteral {
  constructor(readonly params_tokens: Token[], readonly body: Block) {}
  toString = (i = 0) => `(${this.params.join()}) => {${this.body.toString(i)}}`;
  debug = (i = 0) => `(${this.params.join()}) => {${this.body.debug(i)}}`;

  get params() {
    return this.params_tokens.map((p) => p.literal);
  }

  get src() {
    return this.params_tokens.concat(this.body.src);
  }
}

export class ResolvedFunctionLiteral implements NonPrimitiveLiteral {
  constructor(readonly params: ResolvedName[], readonly body: Block) {}
  toString = (i = 0): string =>
    `(${this.params.join()}) => {${this.body.toString(i)}}`;
  debug = (i = 0): string =>
    `(${this.params.join()}) => {${this.body.debug(i)}}`;

  get src() {
    return this.params
      .map((p) => p.src)
      .reduce((a, b) => a.concat(b))
      .concat(this.body.src);
  }
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

  get src() {
    return this.func.src;
  }
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
  | FunctionAnnotationReturn
  | Any
  | All
  | Switch;

export type Stmt =
  | ExpressionStmt
  | Block
  | ConstDecl
  | ResolvedConstDecl
  | FunctionAnnotation;

export interface AstNode {
  tag: string;
  toString(i?: number): string;
  debug(i?: number): string;
}

export interface AstNodeAnnotated extends AstNode {
  // Returns list of tokens making up the AstNode
  get src(): Token[];
}

export class Literal implements AstNodeAnnotated {
  tag = "Literal";
  constructor(readonly val: LiteralType, readonly _src?: Token) {}
  toString = (i = 0) =>
    `${typeof this.val == "object" ? this.val.toString(i) : this.val}`;
  debug = (i = 0) =>
    `${typeof this.val == "object" ? this.val.debug(i) : this.val}`;

  get src(): Token[] {
    return typeof this.val != "object"
      ? this._src == undefined
        ? []
        : [this._src]
      : this.val.src;
  }
}

export class Name implements AstNodeAnnotated {
  tag = "Name";
  constructor(readonly sym_token: Token) {}
  toString = () => this.sym;
  debug = () => `Name[${this.sym}]`;

  get sym() {
    return this.sym_token.literal;
  }

  get src(): Token[] {
    return [this.sym_token];
  }
}

// Name gets converted into ResolvedName
// after the syntactic analysis pass
export class ResolvedName implements AstNodeAnnotated {
  tag = "ResolvedName";
  constructor(readonly sym: Name, readonly env_pos: [number, number]) {}
  toString = () => `${this.sym}`;
  debug = () =>
    `ResolvedName[${this.sym},(${this.env_pos[0]},${this.env_pos[1]})]`;

  get src(): Token[] {
    return this.sym.src;
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

export class ConditionalExpr implements AstNodeAnnotated {
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

  get src(): Token[] {
    return this.pred.src.concat(this.cons.src).concat(this.alt.src);
  }
}

export class AttributeAccess implements AstNodeAnnotated {
  tag = "AttributeAccess";
  constructor(readonly expr: Expression, readonly attribute_token: Token) {}
  toString = (i = 0): string => `(${this.expr.toString(i)}).${this.attribute}`;
  debug = (i = 0): string => `(${this.expr.debug(i)}).${this.attribute}`;

  get attribute() {
    return this.attribute_token.literal;
  }

  get src(): Token[] {
    return this.expr.src.concat([this.attribute_token]);
  }
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

export class Block implements AstNodeAnnotated {
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

  get src(): Token[] {
    return this.stmts
      .map((s) => s.src as Token[])
      .reduce((a, b) => a.concat(b));
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

// ConstDecl gets converted into ResolvedConstDecl
// after the syntactic analysis pass
export class ResolvedConstDecl implements AstNodeAnnotated {
  tag = "ResolvedConstDecl";
  constructor(readonly sym: ResolvedName, readonly expr: Expression) {}
  toString = (i = 0) => `var ${this.sym} = ${this.expr.toString(i)};`;
  debug = (i = 0) => `var ${this.sym} = ${this.expr.debug(i)};`;

  get src(): Token[] {
    return this.sym.src.concat(this.expr.src);
  }
}

export class FunctionAnnotation implements AstNodeAnnotated {
  tag = "FunctionAnnotation";
  constructor(
    readonly annotations: Token[],
    readonly parameters: Expression[],
    readonly _op_src: Token // Original string token
  ) {}
  toString = () => `FunctionAnnotation = ${this._op_src.toString()} `;
  debug = () => `FunctionAnnotation = ${this._op_src.toString()}`;

  get src(): Token[] {
    return [];
  }
}

// DelayedExpr represents an expression that should
// be evaluated in environments above the current one.
export class DelayedExpr implements AstNodeAnnotated {
  tag = "DelayedExpr";
  constructor(readonly expr: Expression, readonly env: Environment) {}
  toString = (i = 0): string => `${this.expr.toString(i)}`;
  debug = (i = 0): string => `DelayedExpr[${this.expr.debug(i)}]`;

  get src(): Token[] {
    return this.expr.src;
  }
}

// This refers to the special symbol
export class FunctionAnnotationReturn implements AstNodeAnnotated {
  tag = "FunctionAnnotationReturn";
  toString = (): string => `FunctionAnnotationReturn`;
  debug = (): string => `FunctionAnnotationReturn`;

  get src(): Token[] {
    return [];
  }
}

export class Any implements AstNodeAnnotated {
  tag = "Any";
  constructor(readonly exprs: Expression[], readonly _op_src: Token[]) {}
  toString = (i = 0): string =>
    `Any[${this.exprs.map((e) => e.toString(i)).join(", ")}]`;
  debug = (i = 0): string =>
    `Any[${this.exprs.map((e) => e.debug(i)).join(", ")}]`;

  get src(): Token[] {
    return this._op_src.concat(
      this.exprs.map((e) => e.src).reduce((a, b) => a.concat(b))
    );
  }
}

export class All implements AstNodeAnnotated {
  tag = "All";
  constructor(readonly exprs: Expression[], readonly _op_src: Token[]) {}
  toString = (i = 0): string =>
    `All[${this.exprs.map((e) => e.toString(i)).join(", ")}]`;
  debug = (i = 0): string =>
    `All[${this.exprs.map((e) => e.debug(i)).join(", ")}]`;

  get src(): Token[] {
    return this._op_src.concat(
      this.exprs.map((e) => e.src).reduce((a, b) => a.concat(b))
    );
  }
}

export class Switch implements AstNodeAnnotated {
  tag = "Switch";
  constructor(
    readonly cases: Map<Expression, Expression>,
    readonly def: Expression,
    readonly _op_src: Token[]
  ) {}
  toString = (i = 0): string =>
    [
      ["switch {"],
      Array.from(this.cases.entries()).map(
        (v) =>
          INDENT.repeat(i + 1) +
          `${v[0].toString(i + 1)}:${v[1].toString(i + 1)}`
      ),
      [INDENT.repeat(i) + "}"],
    ]
      .reduce((a, b) => a.concat(b))
      .join("\n");
  debug = (i = 0): string =>
    [
      ["switch {"],
      Array.from(this.cases.entries()).map(
        (v) =>
          INDENT.repeat(i + 1) + `${v[0].debug(i + 1)}:${v[1].debug(i + 1)}`
      ),
      [INDENT.repeat(i) + "}"],
    ]
      .reduce((a, b) => a.concat(b))
      .join("\n");

  get src(): Token[] {
    return this._op_src.concat(
      Array.from(this.cases.entries())
        .map((v) => v[0].src.concat(v[1].src))
        .reduce((a, b) => a.concat(b))
    );
  }
}
