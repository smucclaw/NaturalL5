import {
  AstNode,
  AttributeAccess,
  BinaryOp,
  Call,
  Closure,
  CompoundLiteral,
  ConditionalExpr,
  Expression,
  FunctionAnnotation,
  FunctionLiteral,
  Literal,
  LiteralType,
  LogicalComposition,
  ResolvedName,
  Switch,
  UnaryOp,
  UserInputLiteral,
} from "./AstNode";
import {
  INDENT,
  Maybe,
  internal_assertion,
  peek,
  zip,
  flatten,
  takeWhile,
} from "./utils";

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
  | ["TraceCompoundLiteral_value", CompoundLiteral]
  | ["FunctionAnnotation", Maybe<FunctionAnnotation>]
  | ["FunctionAnnotationTemplate", Expression, number]
  | ["FunctionAnnotationTemplate_value", LiteralType, number]
  | "FunctionAnnotation_end"
  | ["TraceSwitch", Switch]
  | ["TraceSwitch_value", LiteralType]
  | ["TraceSwitch_casestart", number]
  | ["TraceSwitch_caseend", boolean]
  | ["TraceSwitch_evalcase", number | "default"];

export type TraceStack = TraceNodeNames;

export type TraceLiteralType = LiteralType | TraceCompoundLiteral;
type TLit = TraceLiteralType;

export function TLit_str(tlit: TLit, i: number): string {
  return typeof tlit == "object"
    ? tlit instanceof Closure
      ? "CLOSURE"
      : tlit instanceof UserInputLiteral
      ? `User["${tlit.callback_identifier}", ${tlit.cache}]`
      : tlit instanceof CompoundLiteral
      ? tlit.toString().replace(/\n */gms, " ")
      : tlit.toString(i)
    : `${tlit}`;
}

export class TraceAttribute {
  tag = "TraceAttribute";
  constructor(readonly trace: TraceNode, readonly result: TLit) {}
  toString(i = 0): string {
    return `${this.trace.toString(i)}`;
  }
}

export class TraceCompoundLiteral {
  tag = "TraceCompoundLiteral";
  constructor(
    readonly attributes: Map<string, TraceAttribute>,
    readonly result: CompoundLiteral
  ) {}
  toString(i = 0): string {
    const lines = flatten([
      ["{"],
      Array.from(this.attributes.entries()).map(
        (v) => INDENT.repeat(i + 1) + `${v[0]}: ${v[1].toString(i + 1)}`
      ),
      [INDENT.repeat(i) + "}"],
    ]);
    return lines.join("\n");
  }
}

export interface TraceNode {
  readonly tag: string;
  readonly node: AstNode;
  result: TLit;
  toString(i?: number): string;
}

export class TraceBinaryOp implements TraceNode {
  tag = "TraceBinaryOp";
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
  tag = "TraceLiteral";
  constructor(readonly node: Literal, public result: TLit) {}
  toString = (i = 0): string =>
    this.node.val instanceof UserInputLiteral
      ? `${TLit_str(this.node.val, i)}`
      : this.node.val instanceof Closure
      ? `${TLit_str(this.result, i)}`
      : `${TLit_str(this.result, i)}`;
}

export class TraceResolvedName implements TraceNode {
  tag = "TraceResolvedName";
  constructor(
    readonly node: ResolvedName,
    public result: TLit,
    readonly expr: TraceNode
  ) {}
  toString = (i = 0): string => `${this.node.sym}->${this.expr.toString(i)}`;
}

export class TraceCall implements TraceNode {
  tag = "TraceCall";
  constructor(
    readonly node: Call,
    public result: TLit,
    readonly callexpr: TraceNode,
    readonly bodyexpr: TraceNode,
    readonly annotation?: TraceAnnotation
  ) {}
  toString = (i = 0): string => {
    const lines = flatten([
      [`[${this.callexpr.toString(i)} ::`],
      this.annotation == undefined
        ? []
        : [INDENT.repeat(i + 1) + this.annotation.toString(i + 1)],
      [
        INDENT.repeat(i + 1) +
          this.bodyexpr.toString(i + 1) +
          ":" +
          TLit_str(this.result, i + 1),
      ],
      [INDENT.repeat(i)],
    ]);
    return lines.join("\n");
  };
}

export class TraceImplies implements TraceNode {
  tag = "TraceImplies";
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
  tag = "TraceLogicalComposition";
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
  tag = "TraceUnaryOp";
  constructor(
    readonly node: UnaryOp,
    public result: TLit,
    readonly first: TraceNode
  ) {}
  toString = (i = 0): string =>
    `(${this.node.op}${this.first.toString(i)}):${TLit_str(this.result, i)}`;
}

export class TraceAttributeAccess implements TraceNode {
  tag = "TraceAttributeAccess";
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

export class TraceAnnotationTemplate {
  tag = "TraceAnnotationTemplate";
  constructor(
    // x -> ResolvedName -> a -> UserInput
    readonly node: Expression,
    // x : 10
    public result: TLit,
    readonly is_return: boolean,
    readonly trace: TraceNode
  ) {}
  toString = (i = 0) => `${TLit_str(this.result, i)}`;
}

export class TraceAnnotation {
  tag = "TraceAnnotation";
  constructor(
    readonly node: FunctionAnnotation,
    // x : 10, y : 20, z : 30, % : 60
    readonly templates: TraceAnnotationTemplate[]
  ) {}
  toString = (i = 0) =>
    `"${
      zip(this.node.annotations, this.templates)
        .map((v) => `${v[0].literal}{${v[1].toString(i)}}`)
        .join("") + `${peek(this.node.annotations).literal}`
    }"`;
}

export class TraceSwitch implements TraceNode {
  tag = "TraceSwitch";
  constructor(
    readonly node: Switch,
    readonly result: TLit,
    readonly evaluated_case: [number | "default", TraceNode],
    readonly cases: Maybe<TraceNode>[]
  ) {}

  toString(i = 0) {
    const lines = [
      "switch {",
      ...this.node.cases.map((_, idx) => {
        const casestr =
          this.cases[idx] == undefined
            ? "UNEVALUATED"
            : this.cases[idx]!.toString(i + 1);
        const evalstr =
          "\n" +
          INDENT.repeat(i + 2) +
          (idx == this.evaluated_case[0]
            ? this.evaluated_case[1].toString(i + 2)
            : "UNEVALUATED");
        return INDENT.repeat(i + 1) + `case ${casestr}:${evalstr}`;
      }),
      INDENT.repeat(i + 1) +
        "default:\n" +
        INDENT.repeat(i + 2) +
        (this.evaluated_case[0] == "default"
          ? this.evaluated_case[1].toString(i + 2)
          : "UNEVALUATED"),
      INDENT.repeat(i) + "}",
    ];
    return lines.join("\n");
  }
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
      const [atag, annotation] = tstack.pop()! as [string, FunctionAnnotation];
      internal_assertion(() => atag == "FunctionAnnotation", "Malformed trace");
      if (annotation == undefined) {
        internal_assertion(
          () => tstack.pop() == "FunctionAnnotation_end",
          "Malformed trace"
        );
        return new TraceCall(node, result as TLit, callexpr, bodyexpr);
      }

      const params = new Array(annotation.parameters.length).fill(undefined);
      while (peek(tstack) != "FunctionAnnotation_end") {
        const [vtag, p, idx] = tstack.pop()!;
        internal_assertion(
          () => vtag == "FunctionAnnotationTemplate",
          "Malformed trace"
        );
        const trace = parse(tstack);
        const [vvtag, result, vidx] = tstack.pop()!;
        internal_assertion(
          () => vvtag == "FunctionAnnotationTemplate_value" && vidx == idx,
          "Malformed trace"
        );
        params[idx as number] = new TraceAnnotationTemplate(
          p as Expression,
          result as LiteralType,
          false,
          trace
        );
      }
      tstack.pop();
      params.forEach((p, idx) => {
        if (p != undefined) return;
        params[idx] = new TraceAnnotationTemplate(
          annotation.parameters[idx]!,
          result as LiteralType,
          true,
          bodyexpr
        );
      });
      const fannotation = new TraceAnnotation(annotation, params);
      return new TraceCall(
        node,
        result as TLit,
        callexpr,
        bodyexpr,
        fannotation
      );
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
    case "TraceSwitch": {
      const node = tag[1] as Switch;
      const cases = new Array(node.cases.length).fill(undefined);

      while (peek(tstack)[0] != "TraceSwitch_evalcase") {
        const [tag, caseidx] = tstack.pop()!;
        internal_assertion(
          () => tag == "TraceSwitch_casestart",
          "Malformed trace"
        );
        const casepred = parse(tstack);
        cases[caseidx as number] = casepred;
      }

      const evaluated_case = tstack.pop()![1] as number;
      const evaluated_case_trace = parse(tstack);

      const [stag, switchres] = tstack.pop()!;
      internal_assertion(() => stag == "TraceSwitch_value", "Malformed trace");

      return new TraceSwitch(
        node,
        switchres as TLit,
        [evaluated_case, evaluated_case_trace],
        cases
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
  //console.log(tstack.map((t) => `${t}`));
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

export type TraceTemplateItem =
  | string
  | TraceFormatted
  | TraceFormattedLiteral
  | TraceFormattedQuestion;
export type TraceTemplate = TraceTemplateItem[];

export class TraceFormattedLiteral {
  tag = "TraceFormattedLiteral";
  constructor(readonly value: TLit, readonly _shortform?: string) {}
  toString() {
    return this._shortform == undefined
      ? `${TLit_str(this.value, 0)}`
      : this._shortform;
  }

  get shortform(): string {
    return this.toString();
  }
}

export class TraceFormattedQuestion {
  tag = "TraceFormattedQuestion";
  constructor(readonly question: string) {}
  toString() {
    return this.question;
  }

  get shortform(): string {
    return this.toString();
  }
}

let traceformatted_id = 0;
export class TraceFormatted {
  tag = "TraceFormatted";
  readonly id: number;
  constructor(
    readonly template: TraceTemplate,
    readonly result: TLit,
    public _shortform?: string
  ) {
    traceformatted_id += 1;
    this.id = traceformatted_id;
  }

  get shortform(): string {
    return this._shortform == undefined
      ? `${TLit_str(this.result, 0)}`
      : this._shortform;
  }

  toString(i = 0) {
    const lines: string[] = [
      INDENT.repeat(i) +
        `${this.shortform} (id ${this.id}): ${this.template
          .map((t) => (typeof t == "string" ? t : t.shortform))
          .join("")} \t :: value = ${TLit_str(this.result, i)}`.replace(
          /\n/gms,
          "\n" + INDENT.repeat(i + 1)
        ),
      ...this.template
        .filter((t) => typeof t != "string")
        .map((t) => INDENT.repeat(i + 1) + `${t.toString(i + 1)}`),
    ];
    return lines.join("\n");
  }
}

function optimize(ret: TraceFormatted) {
  const etr = ret.template;
  if (etr.length == 1 && etr[0] instanceof TraceFormatted) {
    // Always prefer the parent shortform over the child shortform
    // as it is more likely to give more information regarding the
    // context
    if (ret._shortform != undefined && etr[0]._shortform == undefined)
      etr[0]._shortform = ret._shortform;
    return etr[0];
  }
  return ret;
}

function expand_trace(
  trace: Maybe<TraceNode>,
  shortform?: string
): TraceTemplate {
  if (trace == undefined) return ["UNEVALUATED"];
  if (["TraceResolvedName", "TraceCall"].includes(trace.tag)) {
    const formatted = format_trace(trace, shortform);
    const etr = formatted.template;
    return etr.length == 1 ? etr : [formatted];
  }
  return format_trace(trace, shortform).template;
}

export function format_trace(
  trace: TraceNode,
  shortform?: string
): TraceFormatted {
  switch (trace.tag) {
    case "TraceBinaryOp": {
      const tr = trace as TraceBinaryOp;
      return optimize(
        new TraceFormatted(
          [
            "(",
            ...expand_trace(tr.first),
            ` ${tr.node.op} `,
            ...expand_trace(tr.second),
            ")",
          ],
          tr.result,
          shortform
        )
      );
    }
    case "TraceLiteral": {
      const tr = trace as TraceLiteral;
      const lit = tr.node.val;
      const val = tr.result;
      if (lit instanceof CompoundLiteral) {
        return optimize(new TraceFormatted([`${lit.sym}`], val, shortform));
      } else if (lit instanceof TraceCompoundLiteral) {
        return optimize(
          new TraceFormatted(
            [
              `${lit.result.sym} {`,
              ...flatten(
                Array.from(lit.attributes.entries()).map((v) => [
                  format_trace(v[1].trace, v[0]),
                  ", ",
                ])
              ).slice(0, -1),
              "}",
            ],
            val,
            shortform
          )
        );
      } else if (lit instanceof Closure) {
        return optimize(new TraceFormatted([`CLOSURE`], val, shortform));
      } else if (lit instanceof UserInputLiteral) {
        return optimize(
          new TraceFormatted(
            [
              `Answer to `,
              new TraceFormattedQuestion(lit.callback_identifier),
              ` (answered `,
              new TraceFormattedLiteral(val),
              `)`,
            ],
            val,
            shortform
          )
        );
      } else {
        return optimize(
          new TraceFormatted([new TraceFormattedLiteral(lit)], val, shortform)
        );
      }
    }
    case "TraceResolvedName": {
      const tr = trace as TraceResolvedName;
      return optimize(
        new TraceFormatted(expand_trace(tr.expr), tr.result, tr.node.sym.sym)
      );
    }
    case "TraceCall": {
      const tr = trace as TraceCall;
      const annotation = tr.annotation;
      if (annotation == undefined) {
        return optimize(
          new TraceFormatted(
            [
              `( `,
              format_trace(tr.bodyexpr, "Computation"),
              ` to return `,
              new TraceFormattedLiteral(tr.result),
              ` )`,
            ],
            tr.result
          )
        );
      }
      return optimize(
        new TraceFormatted(
          [
            ...flatten(
              zip(annotation.node.annotations, annotation.templates)
                .map((v) => [
                  v[0].literal,
                  ...(v[1].is_return
                    ? [format_trace(v[1].trace, `${tr.result}`)]
                    : expand_trace(v[1].trace)),
                ])
                .concat([`${peek(annotation.node.annotations).literal}`])
            )
          ],
          tr.result
        )
      );
    }
    case "TraceImplies": {
      const tr = trace as TraceImplies;
      return optimize(
        new TraceFormatted(
          [
            "(",
            "\n",
            INDENT.repeat(1),
            ...expand_trace(tr.taken),
            " since ",
            "\n",
            INDENT.repeat(1),
            ...expand_trace(tr.pred),
            ` is `, new TraceFormattedLiteral(tr.pred.result),
            "\n",
            ")",
          ],
          tr.result,
          shortform
        )
      );
    }
    case "TraceLogicalComposition": {
      const tr = trace as TraceLogicalComposition;
      const template = [...expand_trace(tr.first)];
      if (tr.second != undefined)
        template.push(` ${tr.node.op} `, ...expand_trace(tr.second));
      return optimize(new TraceFormatted(template, tr.result, shortform));
    }
    case "TraceUnaryOp": {
      const tr = trace as TraceUnaryOp;
      return optimize(
        new TraceFormatted(
          [tr.node.op, ...expand_trace(tr.first)],
          tr.result,
          shortform
        )
      );
    }
    case "TraceAttributeAccess": {
      const tr = trace as TraceAttributeAccess;
      return optimize(
        new TraceFormatted(
          [
            format_trace(
              tr.attribexpr,
              (tr.clitexpr.result as CompoundLiteral).sym + `.${tr.attribname}`
            ),
          ],
          tr.result,
          shortform
        )
      );
    }
    case "TraceSwitch": {
      const tr = trace as TraceSwitch;
      const badcases = takeWhile(
        (c) => !(c != undefined && c.result == true),
        tr.cases
      );
      const [evaled_case, evaled_trace] = tr.evaluated_case;
      const template = [
        "( Since ",
        ...flatten(
          badcases.length == 0
            ? []
            : badcases.map((x, case_idx) =>
                x == undefined
                  ? [
                      "\n",
                      INDENT.repeat(1),
                      `${tr.node.cases[case_idx]![0]}`,
                      " is unknown due to unanswered questions",
                      ", ",
                    ]
                  : [
                      "\n",
                      INDENT.repeat(1),
                      ...expand_trace(x),
                      " is ", new TraceFormattedLiteral(false),
                      ", ",
                    ]
              )
        ).slice(0, -1),
        ", ",
        ...(evaled_case == "default"
          ? [
              "\n",
              INDENT.repeat(1),
              "the default case is applied, returning ",
              ...expand_trace(evaled_trace),
            ]
          : [
              badcases.length == 0 ? "" : "but ",
              "\n",
              INDENT.repeat(1),
              ...expand_trace(tr.cases[evaled_case]),
              " is known to be ", new TraceFormattedLiteral(true), ", hence returning ",
              ...expand_trace(evaled_trace),
            ]),
        "\n",
        " )",
      ];
      return optimize(new TraceFormatted(template, tr.result, shortform));
    }
    default: {
      throw new Error(`Unhandled trace case ${trace.tag}`);
    }
  }
}

// TODO: Deal with programs returning compoundliterals
