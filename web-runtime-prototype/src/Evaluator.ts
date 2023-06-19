import * as Ast from "./AstNode";
import { Environment } from "./Environment";
import * as Eval from "./EvaluatorUtils";
import { id, internal_assertion, assertion, zip } from "./utils";

type L = Ast.LiteralType;
type Callback_t = (cont: (input: L) => L) => void;

const lit = (x: L) => new Ast.Literal(x);

export function recursive_eval(
  program: Ast.AstNode,
  env: Environment,
  callbacks: Map<string, Callback_t>,
  trace: boolean,
  continue_factory: (x: L) => L
): L {
  // Short forms
  const reval = (a: Ast.AstNode, b: Environment, c: (x: L) => L) =>
    recursive_eval(a, b, callbacks, trace, c);
  const C = (x: L) => (x == undefined ? x : continue_factory(x));

  if (trace) {
    console.log(["Program:    "], program.tag, program.toString());
    console.log(["Envionment: "], env.toString());
    console.log();
  }

  switch (program.tag) {
    case "Literal": {
      const node = program as Ast.Literal;
      if (node.val instanceof Ast.UserInputLiteral) {
        const callback = callbacks.get(node.val.callback_identifier);
        assertion(
          () => callback != undefined,
          `Callback '${node.val.callback_identifier}' is not defined`
        );
        callback!(C);
        return undefined;
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
          ? first
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
      return reval(dexpr.expr, temp_env, (result) => {
        env.set_var_mut(node, result);
        return C(result);
      });
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
        return undefined;
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
    readonly callbacks: Map<string, Callback_t>
  ) {}

  static from_program(
    program: Ast.Block,
    callbacks: Map<string, Callback_t>
  ): EvaluatorContext {
    const [env, new_program] = init_global_environment(program);
    return new EvaluatorContext(env, new_program, callbacks);
  }

  evaluate(trace = false): L {
    return recursive_eval(
      this.program,
      this.env.copy(),
      this.callbacks,
      trace,
      id
    );
  }
}
