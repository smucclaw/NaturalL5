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
    // If property isn't in global scope it must be a DelayedExpr
    if (expr instanceof Ast.DelayedExpr) {
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
    // Otherwise it should me made out of
    // literals or userinput
    internal_assertion(
      () => expr instanceof Ast.Literal,
      `Expected DelayedExpr, got ${expr.debug()}`
    );
    return recursive_eval(expr, ctx.env, ctx, trace, (item) => {
      // Set `new_props` to contain the evaluated property
      new_props.set(propstr, lit(item));
      // Evaluate the next property
      return eval_compoundliteral(ctx, trace, clit, C, new_props, p + 1);
    });
  }
  // Return a new CompoundLiteral with all the evaluated properties
  return C(new Ast.CompoundLiteral(clit.sym, new_props));
}

/**
 * Evaluates the program
 * @param program What to evaluate
 * @param env The environment to evaluate this in
 * @param ctx Evaluation contexts containing the callbacks etc
 * @param trace Whether to generate a trace of the execution
 * @param continue_factory Continuous passing function where
 *    calling this with the result of the current evaluation
 *    returns the result of the whole program.
 * @returns Result of the whole program.
 */
function recursive_eval(
  program: Ast.AstNode,
  env: Environment,
  ctx: EvaluatorContext,
  trace: boolean,
  continue_factory: Continuation_t
): L {
  // Short form for the recursive call
  const reval = (a: Ast.AstNode, b: Environment, c: Continuation_t) =>
    recursive_eval(a, b, ctx, trace, c);
  // A wrapper over the continuous passing function
  // This handles the calling of undefined_callback
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
          // Upon calling `callback`, the
          // controlflow is passed into `callback` and so this
          // current trace should return undefined
          return C(undefined);
        }

        // Otherwise we can just take the value in the cache
        // as the value of this variable.
        return C(userinput.cache);
      } else if (node.val instanceof Ast.CompoundLiteral) {
        const clit = node.val as Ast.CompoundLiteral;
        // If the env is in global scope,
        // there is no need to package this in a DelayedExpr
        // as we can evaluate the properties with only the global frame.
        if (env.is_global_scope()) return C(clit);
        // Otherwise we wrap each property in a DelayedExpr
        // so we can evaluate them later.
        clit.props.forEach((e, s) => clit.set(s, new Ast.DelayedExpr(e, env)));
        return C(clit);
      } else {
        // For any other kinds of literals we just return them.
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
        // To determine if we need to evaluate the second operand
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
      // If the name resolves into a literal, we can
      // return it
      if (res_ast instanceof Ast.Literal) {
        return res_ast.val;
      }
      // Otherwise, it has to be a DelayedExpr
      // in order to evaluate it in the environment
      // at which it was declared in.
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

      // We're entering a block, so extend the env with a new frame
      const new_env = env.add_frame_mut();
      const stmts = node.stmts;
      assertion(() => stmts.length != 0, `Block cannot be empty: ${program}`);

      // We scan the env for any variable declarations
      // and add them to the environment.
      stmts.forEach((stmt) => {
        if (!(stmt instanceof Ast.ResolvedConstDecl)) return;

        const expr =
          stmt.expr instanceof Ast.Literal &&
          stmt.expr.val instanceof Ast.ResolvedFunctionLiteral
            ? // If it is a function literal, we package the environment
              // it was declared in together so that the function can be
              // applied.
              lit(new Ast.Closure(stmt.expr.val, new_env))
            : stmt.expr;

        new_env.add_var_mut(stmt.sym, new Ast.DelayedExpr(expr, new_env));
      });
      // Now we evaluate the last statement in the block.
      const last_stmt = stmts[stmts.length - 1]!;
      return last_stmt instanceof Ast.ResolvedConstDecl
        ? C(undefined)
        : reval(last_stmt, new_env, C);
    }
    case "Call": {
      const node = program as Ast.Call;
      // We evaluate node.func
      return reval(node.func, env, (func) => {
        // The result of the evaluation should be a Closure
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

        // We can then extend the environment packaged inside the Closure
        // with the function parameters, and evaluate the function body.
        const func_env = closure.env.add_frame_mut();
        zip(param_names, args).forEach((x) => {
          const [p, a] = x;
          func_env.add_var_mut(p, new Ast.DelayedExpr(a, env));
        });
        return reval(body, func_env, C);
      });
    }
    default:
      assertion(() => false, `Unhandled AstNode: ${program.tag}`);
  }
}

function init_global_environment(
  program: Ast.Block
): [Environment, Ast.AstNode] {
  // Initialise an empty environment
  const env = Environment.empty();
  const stmts = program.stmts;
  assertion(() => stmts.length != 0, `Program cannot be empty: ${program}`);

  // Now we add the global declarations into the global frame of the environment.
  stmts.forEach((stmt) => {
    if (!(stmt instanceof Ast.ResolvedConstDecl)) return;
    const expr =
      stmt.expr instanceof Ast.Literal &&
      stmt.expr.val instanceof Ast.ResolvedFunctionLiteral
        ? // See above in the case for "Block"
          lit(new Ast.Closure(stmt.expr.val, env))
        : stmt.expr;
    env.add_var_mut(stmt.sym, new Ast.DelayedExpr(expr, env));
  });
  const last_stmt = stmts[stmts.length - 1]!;
  // Now we evaluate the last statement of the program.
  const retprogram =
    last_stmt instanceof Ast.ResolvedConstDecl ? lit(undefined) : last_stmt;
  return [env, retprogram];
}

export class EvaluatorContext {
  /**
   *
   * @param env Environment to run the program in
   * @param program Program to be ran
   * @param callbacks Callbacks ran upon a UserInput.
   *    Controlflow is passed into these callbacks
   * @param fini_callback Callback that's ran after the program finishes with result
   * @param undefined_callback Callback that's ran after the program finishes without result
   * @param continuations A map of continuations assigned to each callback
   * @param userinput The set of userinput parsed from the program's AST
   */
  constructor(
    readonly env: Environment,
    readonly program: Ast.AstNode,
    readonly callbacks: Map<string, InputCallback_t>,
    readonly fini_callback: OutputCallback_t,
    readonly undefined_callback: UndefinedCallback_t,
    readonly continuations: Map<string, Continuation_t>,
    readonly userinput: Ast.UserInputLiteral[]
  ) {}

  /**
   * Initialises the EvaluationContext
   * @param code Code to be ran
   * @param fini_callback Callback that's ran after the program finishes with result
   * @param undefined_callback Callback that's ran after the program finishes without result
   * @returns
   */
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

  /**
   * @returns List of userinput parsed from the program
   */
  get_userinput(): Ast.UserInputLiteral[] {
    return this.userinput;
  }

  /**
   * Registers a callback to be ran upon encountering a UserInput
   * @param question
   * @param callback
   */
  register_callback(question: string, callback: InputCallback_t) {
    this.callbacks.set(question, callback);
  }

  /**
   * Returns continuation assigned to the UserInput.
   * This should only be called after the corresponding callback
   * has been executed by the EvaluationContext
   * @param question Question associated with the UserInput
   * @returns Continuation assigned to the UserInput
   */
  get_continuation(question: string): Continuation_t {
    const cont = this.continuations.get(question);
    assertion(
      () => cont != undefined,
      `Continuation doesn't exist. Only call this method in a callback.`
    );
    return cont!;
  }

  /**
   * Evaluate the program
   * @param trace Whether to output a trace of the execution.
   * @returns Returns result of the program
   */
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
