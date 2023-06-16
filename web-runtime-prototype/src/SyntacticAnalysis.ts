import * as Ast from "./AstNode";
import { Environment } from "./Environment";
import { assertion, internal_assertion } from "./utils";

// TODO
// 1. Make sure that UserInput is declared in global scope
// 2. Resolve Names and ConstDecl
// 3. (Stretch) Type check

const lit = (x: Ast.LiteralType) => new Ast.Literal(x);
const U = lit(undefined);
type E = Ast.Expression;

function transform_literal(
  literal: Ast.LiteralType,
  env: Environment
): Ast.LiteralType {
  if (typeof literal != "object") return literal;
  if (literal instanceof Ast.UserInputLiteral) {
    assertion(
      () => env.is_global_scope(),
      `User input must be declared globally.`
    );
    return literal;
  }
  if (literal instanceof Ast.CompoundLiteral) {
    const props = literal.props;
    const new_props = new Map();
    props.forEach((v, k) => new_props.set(k, transform(v, env)));
    return new Ast.CompoundLiteral(literal.sym, new_props);
  }
  if (literal instanceof Ast.FunctionLiteral) {
    const new_env = env.add_frame();
    const curr_frame = new_env.frames[new_env.frames.length - 1]!;
    const params = literal.params;
    const new_params = params.map((v, i) => {
      const new_sym = new Ast.ResolvedName(v, [i, curr_frame.frame_items.size]);
      new_env.add_var_mut(new_sym, U);
      return new_sym;
    });
    const body = literal.body;
    const new_body = transform(body, new_env);
    return new Ast.ResolvedFunctionLiteral(new_params, new_body);
  }
  internal_assertion(() => false, `Unhandled literal: ${literal}`);
  throw null;
}

function transform(program: Ast.AstNode, env: Environment): Ast.AstNode {
  const t = (x: Ast.AstNode) => transform(x, env);
  switch (program.tag) {
    case "Literal": {
      const node = program as Ast.Literal;
      return lit(transform_literal(node.val, env));
    }
    case "BinaryOp": {
      const node = program as Ast.BinaryOp;
      return new Ast.BinaryOp(node.op, t(node.first) as E, t(node.second) as E);
    }
    case "UnaryOp": {
      const node = program as Ast.UnaryOp;
      return new Ast.UnaryOp(node.op, t(node.first) as E);
    }
    case "LogicalComposition": {
      const node = program as Ast.LogicalComposition;
      return new Ast.LogicalComposition(
        node.op,
        t(node.first) as E,
        t(node.second) as E
      );
    }
    case "ConditionalExpr": {
      const node = program as Ast.ConditionalExpr;
      return new Ast.ConditionalExpr(
        t(node.pred) as E,
        t(node.cons) as E,
        t(node.alt) as E
      );
    }
    case "AttributeAccess": {
      const node = program as Ast.AttributeAccess;
      return new Ast.AttributeAccess(t(node.expr) as E, node.attribute);
    }
    case "Name": {
      const node = program as Ast.Name;
      return new Ast.ResolvedName(node.sym, env.lookup_name(node));
    }
    case "ExpressionStmt": {
      const node = program as Ast.ExpressionStmt;
      return new Ast.ExpressionStmt(t(node.expr) as E);
    }
    case "Block": {
      const node = program as Ast.Block;
      const new_env = env.add_frame();
      const stmts = node.stmts;
      assertion(() => stmts.length != 0, `Block cannot be empty: ${program}`);
      const new_stmts = stmts.map((stmt) => {
        if (!(stmt instanceof Ast.ConstDecl))
          return transform(stmt, new_env) as Ast.Stmt;
        const curr_frame = new_env.frames[new_env.frames.length - 1]!;
        const new_sym = new Ast.ResolvedName(stmt.sym, [
          new_env.frames.length - 1,
          curr_frame.frame_items.size,
        ]);
        new_env.add_var_mut(new_sym, U);
        const new_expr = transform(stmt.expr, new_env);
        return new Ast.ResolvedConstDecl(new_sym, new_expr as Ast.Expression);
      });
      return new Ast.Block(new_stmts);
    }
    case "Call": {
      const node = program as Ast.Call;
      return new Ast.Call(
        t(node.func) as E,
        node.args.map((x) => t(x) as E)
      );
    }
    default:
      internal_assertion(() => false, `Unhandled AstNode: ${program}`);
      throw null;
  }
}

export function transform_program(program: Ast.Block): Ast.Block {
  const env = Environment.empty();
  const stmts = program.stmts;
  assertion(() => stmts.length != 0, `Program cannot be empty: ${program}`);
  const new_stmts = stmts.map((stmt) => {
    if (!(stmt instanceof Ast.ConstDecl))
      return transform(stmt, env) as Ast.Stmt;
    const new_sym = new Ast.ResolvedName(stmt.sym, [
      "global",
      env.global_frame.frame_items.size,
    ]);
    env.add_var_mut(new_sym, U);
    const new_expr = transform(stmt.expr, env);
    return new Ast.ResolvedConstDecl(new_sym, new_expr as Ast.Expression);
  });
  return new Ast.Block(new_stmts);
}
