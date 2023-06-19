import * as Ast from "./AstNode";
import { Environment } from "./Environment";
import * as Eval from "./EvaluatorUtils";
import { id, internal_assertion, assertion, zip } from "./utils";

type E = Ast.Expression;
type Callback_t = (
  ctx: EvaluatorContext,
  curr_ast: Ast.Expression
) => Ast.PrimitiveType;

const lit = (x: Ast.LiteralType) => new Ast.Literal(x);

export function recursive_eval(
  program: Ast.AstNode,
  env: Environment,
  callbacks: Map<string, Callback_t>,
  ast_factory: (updated: E) => E,
  trace: boolean
): [Ast.LiteralType, Environment] {
  // Short forms
  const reval = (a: Ast.AstNode, b: Environment, c: (updated: E) => E) =>
    recursive_eval(a, b, callbacks, c, trace);
  const chain = (a: (b: E) => E) => (b: E) => ast_factory(a(b));

  let result;
  let new_env = env;
  switch (program.tag) {
    case "Literal": {
      const node = program as Ast.Literal;
      if (node.val instanceof Ast.UserInputLiteral) {
        const callback = callbacks.get(node.val.callback_identifier);
        assertion(
          () => callback != undefined,
          `Callback '${node.val.callback_identifier}' is not defined`
        );
        result = callback!(
          new EvaluatorContext(new_env, ast_factory(program as E), callbacks),
          ast_factory(new Ast.NoOpWrapper(program))
        );
      } else {
        result = node.val;
      }
      break;
    }
    case "BinaryOp": {
      const node = program as Ast.BinaryOp;
      let first: Ast.LiteralType, second: Ast.LiteralType;
      [first, new_env] = reval(
        node.first,
        new_env,
        chain((x) => new Ast.BinaryOp(node.op, x as E, node.second))
      );
      [second, new_env] = reval(
        node.second,
        new_env,
        chain((x) => new Ast.BinaryOp(node.op, lit(first), x as E))
      );
      result = Eval.binop_apply(node.op, first, second);
      break;
    }
    case "UnaryOp": {
      const node = program as Ast.UnaryOp;
      let first: Ast.LiteralType;
      [first, new_env] = reval(
        node.first,
        new_env,
        chain((x) => new Ast.UnaryOp(node.op, x as E))
      );
      result = Eval.unop_apply(node.op, first);
      break;
    }
    case "LogicalComposition": {
      const node = program as Ast.LogicalComposition;
      let first: Ast.LiteralType, second: Ast.LiteralType;
      [first, new_env] = reval(
        node.first,
        new_env,
        chain((x) => new Ast.LogicalComposition(node.op, x as E, node.second))
      );
      const eval_second = Eval.logicalcomp_eval_second(node.op, first);
      if (!eval_second) {
        result = first;
        break;
      }
      [second, new_env] = reval(
        node.second,
        new_env,
        chain((x) => new Ast.LogicalComposition(node.op, lit(first), x as E))
      );
      result = Eval.logicalcomp_apply(node.op, first, second);
      break;
    }
    case "ConditionalExpr": {
      const node = program as Ast.ConditionalExpr;
      let pred;
      [pred, new_env] = reval(
        node.pred,
        new_env,
        chain((x) => new Ast.ConditionalExpr(x as E, node.cons, node.alt))
      );
      [result, new_env] = reval(
        pred ? node.cons : node.alt,
        new_env,
        chain(id)
      );
      break;
    }
    case "AttributeAccess": {
      const node = program as Ast.AttributeAccess;
      let obj;
      [obj, new_env] = reval(
        node.expr,
        new_env,
        chain((x) => new Ast.AttributeAccess(x as E, node.attribute))
      );
      const attrib = Eval.attrib_apply(node.attribute, obj);
      [result, new_env] = reval(attrib, new_env, ast_factory);
      break;
    }
    case "ResolvedName": {
      const node = program as Ast.ResolvedName;
      const res_ast = env.lookup(node);
      if (res_ast instanceof Ast.Literal) {
        result = res_ast.val;
        break;
      }
      internal_assertion(
        () => res_ast instanceof Ast.DelayedExpr,
        `${node} doesn't resolve into a DelayExpr. Resolved into ${res_ast.tag} instead`
      );
      const dexpr = res_ast as Ast.DelayedExpr;
      const temp_env = dexpr.env;
      result = reval(dexpr.expr, temp_env, ast_factory)[0];
      new_env = new_env.set_var(node, result);
      break;
    }
    case "ExpressionStmt": {
      const node = program as Ast.ExpressionStmt;
      [result, new_env] = reval(node.expr, new_env, ast_factory);
      break;
    }
    case "Block": {
      const node = program as Ast.Block;
      new_env = new_env.add_frame(); // Enter block: Extend environment
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
        result = undefined;
        new_env = new_env.remove_frame();
        break;
      }
      [result, new_env] = reval(last_stmt, new_env, chain(id));
      new_env = new_env.remove_frame(); // Exit block: Detract environment
      break;
    }
    case "Call": {
      const node = program as Ast.Call;
      let func: Ast.LiteralType;
      [func, new_env] = reval(
        node.func,
        new_env,
        chain((x) => new Ast.Call(x, node.args))
      );
      assertion(
        () => func instanceof Ast.Closure,
        `Attempted to call on ${func} which isn't a function`
      );
      func = func as Ast.Closure;
      const body = func.func.body;
      const param_names = func.func.params;
      const args = node.args;
      assertion(
        () => param_names.length == args.length,
        `Number of arguments given (${param_names.length}) don't match function signature (${args.length}).`
      );
      const func_env = func.env.add_frame();
      zip(param_names, args).forEach((x) => {
        const [p, a] = x;
        // Evaluate arguments in frame at which it was declared
        func_env.add_var_mut(p, new Ast.DelayedExpr(a, new_env));
      });
      result = reval(body, func_env, chain(id))[0];
      break;
    }
    default:
      throw new Error(`Unhandled AstNode: ${program.tag}`);
  }

  if (trace) {
    console.log(">>>>>>>>>>>>>>>>> " + program.tag);
    console.log("Environment:", new_env.toString());
    console.log("Evaluated  :", program.toString());
    console.log(
      "Current AST:",
      ast_factory(new Ast.NoOpWrapper(lit(result))).toString()
    );
    console.log();
  }
  return [result, new_env];
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
    readonly callbacks: Map<string, Callback_t>
  ) {}

  static from_program(
    program: Ast.Block,
    callbacks: Map<string, Callback_t>
  ): EvaluatorContext {
    const [env, new_program] = init_global_environment(program);
    return new EvaluatorContext(env, new_program, callbacks);
  }

  evaluate(trace = false): Ast.LiteralType {
    const [res, _] = recursive_eval(
      this.program,
      this.env,
      this.callbacks,
      id,
      trace
    );
    return res;
  }
}
