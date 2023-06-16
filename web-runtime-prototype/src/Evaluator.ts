import * as Ast from "./AstNode";
import { Environment } from "./Environment";
import * as Eval from "./EvaluatorUtils";
import { id } from "./utils";

type E = Ast.Expression;

export function recursive_eval(
  program: Ast.AstNode,
  env: Environment,
  ast_factory: (updated: E) => E
): [Ast.LiteralType, Environment] {
  // Short forms
  const reval = recursive_eval;
  const chain = (a: (b: E) => E) => (b: E) => ast_factory(a(b));
  const lit = (x: Ast.LiteralType) => new Ast.Literal(x);

  let result;
  let new_env = env;
  switch (program.tag) {
    case "Literal": {
      const node = program as Ast.Literal;
      if (node.val instanceof Ast.UserInputLiteral) {
        result = node.val.callback(
          new EvaluatorContext(new_env, ast_factory(program as E)),
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
      [result, new_env] = reval(res_ast, new_env, ast_factory);
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
        let expr = stmt.expr;
        if (expr instanceof Ast.ResolvedFunctionLiteral) {
          expr = lit(new Ast.ClosureLiteral(expr, new_env));
        }
        new_env.add_var_mut(stmt.sym, expr);
      });
      const last_stmt = stmts[stmts.length - 1]!;
      if (last_stmt instanceof Ast.ResolvedConstDecl) {
        result = undefined;
        break;
      }
      [result, new_env] = reval(last_stmt, new_env, chain(id));
      new_env = new_env.remove_frame(); // Exit block: Detract environment
      break;
    }
    //case "Call": {
    //  // TODO
    //  break;
    //}
    default:
      throw new Error(`Unhandled AstNode: ${program.tag}`);
  }

  console.log(">>>>>>>>>>>>>>>>> " + program.tag);
  console.log("Environment:", new_env.toString());
  console.log("Evaluated  :", program.toString());
  console.log(
    "Current AST:",
    ast_factory(new Ast.NoOpWrapper(lit(result))).toString()
  );
  console.log();
  return [result, new_env];
}

function init_global_environment(
  program: Ast.Block
): [Environment, Ast.AstNode] {
  const env = Environment.empty();
  let retprogram: Ast.AstNode;

  const stmts = program.stmts;
  if (stmts.length == 0) throw new Error(`Program cannot be empty: ${program}`);
  stmts.forEach((stmt) => {
    if (!(stmt instanceof Ast.ResolvedConstDecl)) return;
    let expr = stmt.expr;
    if (stmt.expr instanceof Ast.ResolvedFunctionLiteral) {
      expr = new Ast.Literal(new Ast.ClosureLiteral(stmt.expr, env));
    }
    env.add_var_mut(stmt.sym, expr);
  });
  const last_stmt = stmts[stmts.length - 1]!;
  if (last_stmt instanceof Ast.ResolvedConstDecl) {
    retprogram = new Ast.Literal(undefined);
  }
  retprogram = last_stmt;
  return [env, retprogram];
}

export class EvaluatorContext {
  constructor(readonly env: Environment, readonly program: Ast.AstNode) {}

  static from_program(program: Ast.Block): EvaluatorContext {
    const [env, new_program] = init_global_environment(program);
    return new EvaluatorContext(env, new_program);
  }

  evaluate(): Ast.LiteralType {
    const [res, _] = recursive_eval(this.program, this.env, id);
    return res;
  }
}
