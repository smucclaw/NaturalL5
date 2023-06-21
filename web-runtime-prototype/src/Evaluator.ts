import * as Ast from "./AstNode";
import { lex } from "./Lexer";
import { Token } from "./Token";
import { parse } from "./Parser";
import { transform_program } from "./SyntacticAnalysis";
import { Environment, Frame } from "./Environment";
import * as Eval from "./EvaluatorUtils";
import { internal_assertion, assertion, zip } from "./utils";

type L = Ast.LiteralType;
export type Continuation_t = (input: L) => L;
export type InputCallback_t = (globals: Frame) => void;
export type OutputCallback_t = (fini: L, globals: Frame) => void;
export type UndefinedCallback_t = () => void;

const lit = (x: L) => new Ast.Literal(x);

function eval_compoundliteral(
  ctx: EvaluatorContext,
  trace: boolean,
  clit: Ast.CompoundLiteral,
  C: Continuation_t,
  new_props = new Map(),
  p = 0
): L {
  // We make clit's properties into an array so we can index.
  const props = [...clit.props.entries()];
  // We haven't evaluated all the properties,
  if (p < props.length) {
    // Get the property to evaluate
    const [propstr, expr] = props[p]!;
    internal_assertion(
      () => expr instanceof Ast.DelayedExpr,
      `Expected DelayedExpr, got ${expr.debug()}`
    );

    // Now evaluate the property in the environment at which it
    // was declared
    const dexpr = expr as Ast.DelayedExpr;
    return recursive_eval(dexpr.expr, dexpr.env, ctx, trace, (item) => {
      // Set `new_props` to contain the evaluated property
      new_props.set(propstr, lit(item));
      // Evaluate the next property
      return eval_compoundliteral(ctx, trace, clit, C, new_props, p + 1);
    });
  }
  // Return a new CompoundLiteral with all the evaluated properties
  return C(new Ast.CompoundLiteral(clit.sym, new_props));
}

function recursive_eval(
  program: Ast.AstNode,
  env: Environment,
  ctx: EvaluatorContext,
  trace: boolean,
  continue_factory: Continuation_t
): L {
  // Short forms
  const reval = (a: Ast.AstNode, b: Environment, c: Continuation_t) =>
    recursive_eval(a, b, ctx, trace, c);
  const C = (x: L) => {
    if (x != undefined) return continue_factory(x);
    ctx.undefined_callback();
    return undefined;
  };

  if (trace) {
    console.log(["Program:    "], program.tag, program.toString());
    console.log(["Envionment: "], env.toString());
    console.log();
  }

  switch (program.tag) {
    case "Literal": {
      const node = program as Ast.Literal;
      if (node.val instanceof Ast.UserInputLiteral) {
        const userinput = node.val;
        const callback = ctx.callbacks.get(userinput.callback_identifier);
        assertion(
          () => callback != undefined,
          `Callback '${userinput.callback_identifier}' is not defined`
        );
        // We update the continuation for the callbacks according to the
        // new computations
        ctx.continuations.set(userinput.callback_identifier, (x: L) => {
          // We set the value returned from application of the callback
          // in the userinput cache so we don't have to ask the user again
          // for this current trace.
          userinput.cache = x;
          return C(x);
        });
        // If cache doesn't exist, we need to ask from the user
        if (userinput.cache == undefined) {
          callback!(env.global_frame);
          return C(undefined);
        }
        // Otherwise we can just take the value in the cache
        // as the value of this variable.
        return C(userinput.cache);
      } else if (node.val instanceof Ast.CompoundLiteral) {
        const clit = node.val as Ast.CompoundLiteral;
        if (env.is_global_scope()) return C(clit);
        clit.props.forEach((e, s) => clit.set(s, new Ast.DelayedExpr(e, env)));
        return C(clit);
      } else {
        return C(node.val);
      }
    }
    case "BinaryOp": {
      const node = program as Ast.BinaryOp;
      return reval(node.first, env, (first) =>
        reval(node.second, env, (second) =>
          C(Eval.binop_apply(node.op, first, second))
        )
      );
    }
    case "UnaryOp": {
      const node = program as Ast.UnaryOp;
      return reval(node.first, env, (first) =>
        C(Eval.unop_apply(node.op, first))
      );
    }
    case "LogicalComposition": {
      const node = program as Ast.LogicalComposition;
      return reval(node.first, env, (first) => {
        const eval_second = Eval.logicalcomp_eval_second(node.op, first);
        return !eval_second
          ? C(first)
          : reval(node.second, env, (second) =>
              C(Eval.logicalcomp_apply(node.op, first, second))
            );
      });
    }
    case "ConditionalExpr": {
      const node = program as Ast.ConditionalExpr;
      return reval(node.pred, env, (pred) =>
        reval(pred ? node.cons : node.alt, env, C)
      );
    }
    case "AttributeAccess": {
      const node = program as Ast.AttributeAccess;
      return reval(node.expr, env, (obj) =>
        reval(Eval.attrib_apply(node.attribute, obj), env, C)
      );
    }
    case "ResolvedName": {
      const node = program as Ast.ResolvedName;
      const res_ast = env.lookup(node);
      if (res_ast instanceof Ast.Literal) {
        return C(res_ast.val);
      }
      internal_assertion(
        () => res_ast instanceof Ast.DelayedExpr,
        `${node} doesn't resolve into a DelayExpr. Resolved into ${res_ast.tag} instead`
      );
      const dexpr = res_ast as Ast.DelayedExpr;
      const temp_env = dexpr.env;
      return reval(dexpr.expr, temp_env, C);
    }
    case "ExpressionStmt": {
      const node = program as Ast.ExpressionStmt;
      return reval(node.expr, env, C);
    }
    case "Block": {
      const node = program as Ast.Block;
      const new_env = env.add_frame_mut(); // Enter block: Extend environment
      const stmts = node.stmts;
      if (stmts.length == 0)
        throw new Error(`Block cannot be empty: ${program}`);
      // Add declarations to environment
      stmts.forEach((stmt) => {
        if (!(stmt instanceof Ast.ResolvedConstDecl)) return;
        const expr =
          stmt.expr instanceof Ast.Literal &&
          stmt.expr.val instanceof Ast.ResolvedFunctionLiteral
            ? lit(new Ast.Closure(stmt.expr.val, new_env))
            : stmt.expr;
        new_env.add_var_mut(stmt.sym, new Ast.DelayedExpr(expr, new_env));
      });
      const last_stmt = stmts[stmts.length - 1]!;
      if (last_stmt instanceof Ast.ResolvedConstDecl) {
        return C(undefined);
      }
      return reval(last_stmt, new_env, C);
    }
    case "Call": {
      const node = program as Ast.Call;
      return reval(node.func, env, (func) => {
        assertion(
          () => func instanceof Ast.Closure,
          `Attempted to call on ${func} which isn't a function`
        );
        const closure = func as Ast.Closure;
        const body = closure.func.body;
        const param_names = closure.func.params;
        const args = node.args;
        assertion(
          () => param_names.length == args.length,
          `Number of arguments given (${param_names.length}) don't match function signature (${args.length}).`
        );
        const func_env = closure.env.add_frame_mut();
        zip(param_names, args).forEach((x) => {
          const [p, a] = x;
          func_env.add_var_mut(p, new Ast.DelayedExpr(a, env));
        });
        return reval(body, func_env, C);
      });
    }
    default:
      throw new Error(`Unhandled AstNode: ${program.tag}`);
  }
}

function init_global_environment(
  program: Ast.Block
): [Environment, Ast.AstNode] {
  const env = Environment.empty();
  const stmts = program.stmts;
  if (stmts.length == 0) throw new Error(`Program cannot be empty: ${program}`);
  stmts.forEach((stmt) => {
    if (!(stmt instanceof Ast.ResolvedConstDecl)) return;
    const expr =
      stmt.expr instanceof Ast.Literal &&
      stmt.expr.val instanceof Ast.ResolvedFunctionLiteral
        ? lit(new Ast.Closure(stmt.expr.val, env))
        : stmt.expr;
    env.add_var_mut(stmt.sym, new Ast.DelayedExpr(expr, env));
  });
  const last_stmt = stmts[stmts.length - 1]!;
  const retprogram =
    last_stmt instanceof Ast.ResolvedConstDecl ? lit(undefined) : last_stmt;
  return [env, retprogram];
}

export class EvaluatorContext {
  constructor(
    readonly env: Environment,
    readonly program: Ast.AstNode,
    readonly callbacks: Map<string, InputCallback_t>,
    readonly fini_callback: OutputCallback_t,
    readonly undefined_callback: UndefinedCallback_t,
    readonly continuations: Map<string, Continuation_t>,
    readonly userinput: Ast.UserInputLiteral[]
  ) {}

  static from_program(
    code: string,
    fini_callback: OutputCallback_t,
    undefined_callback: UndefinedCallback_t
  ): EvaluatorContext {
    const tokens: Array<Token> = lex(code);
    const parser_ast = parse(tokens);
    const [eval_ast, userinput] = transform_program(parser_ast);
    const [env, new_program] = init_global_environment(eval_ast);
    return new EvaluatorContext(
      env,
      new_program,
      new Map(),
      fini_callback,
      undefined_callback,
      new Map(),
      userinput
    );
  }

  get_userinput(): Ast.UserInputLiteral[] {
    return this.userinput;
  }

  register_callback(question: string, callback: InputCallback_t) {
    this.callbacks.set(question, callback);
  }

  get_continuation(question: string): Continuation_t {
    const cont = this.continuations.get(question);
    assertion(
      () => cont != undefined,
      `Continuation doesn't exist. Only call this method in a callback.`
    );
    return cont!;
  }

  evaluate(trace = false): L {
    return recursive_eval(this.program, this.env, this, trace, (x: L) => {
      if (x != undefined) {
        if (x instanceof Ast.CompoundLiteral) {
          // We can't evaluate a compound literal's properties
          // unconditionally. We should only ever
          // evaluate them when the program returns
          // a compound literal.
          return eval_compoundliteral(this, trace, x, (x: L) => {
            this.fini_callback(x, this.env.global_frame);
            return x;
          });
        }
        this.fini_callback(x, this.env.global_frame);
        return x;
      }
      return undefined;
    });
  }
}
