import * as Ast from "./AstNode";
import { lex } from "./Lexer";
import { Token } from "./Token";
import { parse } from "./Parser";
import { transform_program } from "./SyntacticAnalysis";
import { Environment, Frame } from "./Environment";
import * as Eval from "./EvaluatorUtils";
import { internal_assertion, assertion, peek, empty, zip } from "./utils";

// TODO: Add invalidate callback

const lit = (x: L) => new Ast.Literal(x);

type L = Ast.LiteralType;
export type Continue_t = (x:L) => void;
export type InputCallback_t = (cont: Continue_t, globals: Frame) => void;
export type OutputCallback_t = (fini: L, globals: Frame) => void;
export type UndefinedCallback_t = (globals: Frame) => void;

type EvalNodeApply_t = (
  stack: L[],
  agenda: Ast.AstNode[],
  envs: Environment[]
) => void;

class EvalNode implements Ast.AstNode {
  tag = "internal";
  constructor(readonly operation: string, readonly apply: EvalNodeApply_t) {}
  toString = () => `internal_${this.operation}`;
  debug = this.toString;
}

const popenv = new EvalNode("popenv", (_1, _2, envs) => envs.pop());

function one_step_evaluate(
  envs: Environment[],
  ctx: EvaluatorContext,
  trace: boolean,
  agenda: Ast.AstNode[],
  stack: L[]
) {
  const program = agenda.pop()!;
  const env = peek(envs);
  internal_assertion(
    () => program != undefined,
    `Malformed program! Expected non-empty agenda.`
  );
  internal_assertion(
    () => env != undefined,
    `Malformed program! Expected non-empty env stack.`
  );

  const early_return_helper = () => {
    empty(envs);
    empty(stack);
    empty(agenda);
    stack.push(undefined);
  }

  if (trace) {
    console.log(["Program:    "], program.tag, program.toString());
    console.log(["Envionment: "], env.toString());
    console.log(["Stack:      "], stack.map((x) => `${x}`).join(", "));
    console.log();
  }

  switch (program.tag) {
    case "Literal": {
      const node = program as Ast.Literal;
      if (node.val instanceof Ast.UserInputLiteral) {
        // We get the value of the callback from the user.
        const userinput = node.val;
        const callback = ctx.input_callbacks.get(userinput.callback_identifier);
        assertion(
          () => callback != undefined,
          `Callback '${userinput.callback_identifier}' is not defined`
        );
        
        // If cache doesn't exist, we need to ask from the user
        if (userinput.cache == undefined) {
          // We pass a function to continue execution
          // from the given input
          const cont = (input:L) => {
            // We check the type of the input
            assertion(() => typeof input == userinput.type, 
              `Input is of wrong type for ${userinput}. `
              + `Expected ${userinput.type}, got ${typeof input}, `
              + `input = ${input}`
            );
            // We update the value of this userinput
            userinput.cache = input;
            // And evaluate from the beginning
            ctx.evaluate(trace);
          }
          callback!(cont, env.global_frame);
          early_return_helper();
          return;
        }
        stack.push(userinput.cache);

      } else if (node.val instanceof Ast.CompoundLiteral) {
        throw null;
      } else {
        stack.push(node.val);
      }
      return;
    }
    case "BinaryOp": {
      const node = program as Ast.BinaryOp;
      const inst = new EvalNode("binop", (stack) =>
        stack.push(Eval.binop_apply(node.op, stack.pop(), stack.pop()))
      );
      agenda.push(inst, node.first, node.second);
      return;
    }
    case "UnaryOp": {
      const node = program as Ast.UnaryOp;
      const inst = new EvalNode("unop", (stack) =>
        stack.push(Eval.unop_apply(node.op, stack.pop()))
      );
      agenda.push(inst, node.first);
      return;
    }
    case "LogicalComposition": {
      const node = program as Ast.LogicalComposition;
      const inst2 = new EvalNode("logicop2", (stack) =>
        stack.push(Eval.logicalcomp_apply(node.op, stack.pop(), stack.pop()))
      );
      const inst1 = new EvalNode("logicop1", (stack, agenda) => {
        const first = peek(stack);
        const to_eval_second = Eval.logicalcomp_eval_second(node.op, first);
        if (!to_eval_second) return;
        agenda.push(inst2, node.second);
      });
      agenda.push(inst1, node.first);
      return;
    }
    case "ConditionalExpr": {
      const node = program as Ast.ConditionalExpr;
      const inst = new EvalNode("cond", (stack, agenda) =>
        agenda.push(stack.pop() ? node.cons : node.alt)
      );
      agenda.push(inst, node.pred);
      return;
    }
    case "AttributeAccess": {
      const node = program as Ast.AttributeAccess;
      const inst = new EvalNode("attrib", (stack, agenda) =>
        agenda.push(Eval.attrib_apply(node.attribute, stack.pop()))
      );
      agenda.push(inst, node.expr);
      return;
    }
    case "ResolvedName": {
      const node = program as Ast.ResolvedName;
      const res_ast = env.lookup(node);
      // If the name resolves into a literal, we can
      // return it
      if (res_ast instanceof Ast.Literal) {
        stack.push(res_ast.val);
        return;
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
      const inst = new EvalNode("resolvename", (stack) => {
        const res = peek(stack);
        // If the variable is in global scope,
        // it is a UserInput or constant.
        // This code will only be called on the former,
        // where we don't wanna overwrite the UserInput 
        // with a constant.
        if (!env.is_global_var(node))
          env.set_var_mut(node, res);
      });
      envs.push(temp_env);
      agenda.push(popenv, inst, dexpr.expr);
      return;
    }
    case "ExpressionStmt": {
      const node = program as Ast.ExpressionStmt;
      agenda.push(node.expr);
      return;
    }
    case "Block": {
      const node = program as Ast.Block;

      // We're entering a block, so extend the env with a new frame
      const new_env = env.copy();
      new_env.add_frame_mut();
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
            : new Ast.DelayedExpr(stmt.expr, new_env);

        new_env.add_var_mut(stmt.sym, expr);
      });

      // Now we evaluate the last statement in the block.
      const last_stmt = stmts[stmts.length - 1]!;
      if (last_stmt instanceof Ast.ResolvedConstDecl) {
        stack.push(undefined);
        return;
      }
      envs.push(new_env);
      agenda.push(popenv, last_stmt);
      return;
    }
    case "Call": {
      const node = program as Ast.Call;
      const inst1 = new EvalNode("call1", (stack) => {
        const func = stack.pop();
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
        const func_env = closure.env.copy();
        func_env.add_frame_mut();
        zip(param_names, args).forEach((x) => {
          const [p, a] = x;
          func_env.add_var_mut(p, new Ast.DelayedExpr(a, env));
        });

        envs.push(func_env);
        agenda.push(popenv, body);
      });
      // Evalutate node.func, which should evaluate to a Closure
      agenda.push(inst1, node.func);
      return;
    }
    case "internal": {
      const node = program as EvalNode;
      node.apply(stack, agenda, envs);
      return;
    }
    default:
      assertion(() => false, `Unhandled AstNode: ${program.tag}`);
      throw null;
  }
}

function evaluate(
  prog: Ast.AstNode,
  env: Environment,
  ctx: EvaluatorContext,
  trace: boolean
): L {
  const agenda: Ast.AstNode[] = [prog];
  const stack: L[] = [];
  const envs: Environment[] = [env];

  do {
    one_step_evaluate(envs, ctx, trace, agenda, stack);
  } while (agenda.length > 0);

  internal_assertion(
    () => stack.length == 1,
    `Malformed program! Expected stack size to be 1, got ${stack.length} instead. ` +
      `Stack = ${stack}`
  );

  return stack[0];
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
  constructor(
    readonly env: Environment,
    readonly program: Ast.AstNode,
    readonly input_callbacks: Map<string, InputCallback_t>,
    readonly fini_callback: OutputCallback_t,
    readonly undefined_callback: UndefinedCallback_t,
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
  register_input_callback(question: string, callback: InputCallback_t) {
    this.input_callbacks.set(question, callback);
  }

  /**
   * Evaluate the program
   * @param trace Whether to output a trace of the execution.
   * @returns Returns result of the program
   */
  evaluate(trace = false) {
    const env = this.env.copy();
    const result = evaluate(this.program, env, this, trace);
    if (result == undefined) {
      this.undefined_callback(env.global_frame);
    } else {
      this.fini_callback(result, env.global_frame);
    }
  }
}
