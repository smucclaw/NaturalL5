import * as Ast from "./AstNode";
import { Environment } from "./Environment";
import { internal_assertion } from "./utils";

// TODO
// 1. Make sure that UserInput is declared in global scope
// 2. Resolve Names and ConstDecl
// 3. (Stretch) Type check

const lit = (x: Ast.LiteralType) => new Ast.Literal(x);
const U = lit(undefined);
type E = Ast.Expression;

function check_literal(literal: Ast.LiteralType, env: Environment) {
  // TODO
}

function transform(program: Ast.AstNode, env: Environment): Ast.AstNode {
  const t = (x: Ast.AstNode) => transform(x, env);
  switch (program.tag) {
    case "Literal": {
      const node = program as Ast.Literal;
      check_literal(node.val, env);
      return node;
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
      // TODO
      break;
    }
    case "ExpressionStmt": {
      const node = program as Ast.ExpressionStmt;
      return new Ast.ExpressionStmt(t(node.expr) as E);
      break;
    }
    case "Block": {
      // TODO
      break;
    }
    case "Call": {
      // TODO
      break;
    }
  }
}

function transform_program(program: Ast.Block): Ast.AstNode {
  const env = Environment.empty();
  const stmts = program.stmts;
  if (stmts.length == 0) throw new Error(`Program cannot be empty: ${program}`);
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
