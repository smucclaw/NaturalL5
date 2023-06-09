import * as Ast from "./AstNode";
import { Environment } from "./Environment";
import { assertion, internal_assertion } from "./utils";

// Stretch goals:
// - Type check

const lit = (x: Ast.LiteralType) => new Ast.Literal(x);
const U = lit(undefined);
type E = Ast.Expression;

function transform_literal(
  literal: Ast.LiteralType,
  env: Environment,
  userinput: Ast.UserInputLiteral[]
): Ast.LiteralType {
  if (typeof literal != "object") return literal;

  if (literal instanceof Ast.UserInputLiteral) {
    assertion(
      () => env.is_global_scope(),
      `User input must be declared globally: : ${literal}`
    );
    userinput.push(literal);
    return literal;
  }

  if (literal instanceof Ast.CompoundLiteral) {
    const props = literal.props;
    const new_props = new Map();
    props.forEach((v, k) => {
      if (!env.is_global_scope())
        return new_props.set(k, transform(v, env, userinput));
      assertion(
        () => v instanceof Ast.Literal,
        `Only constant declarations with literals allowed in global scope: ${v}`
      );
      const cv = transform_literal((v as Ast.Literal).val, env, userinput);
      return new_props.set(k, lit(cv));
    });
    return new Ast.CompoundLiteral(
      literal.sym_token,
      new_props,
      literal.prop_tokens
    );
  }

  if (literal instanceof Ast.FunctionLiteral) {
    const new_env = env.copy();
    new_env.add_frame_mut();
    const curr_frame = new_env.frames[new_env.frames.length - 1]!;
    const params = literal.params_tokens;

    const new_params = params.map((v) => {
      const new_sym = new Ast.ResolvedName(new Ast.Name(v), [
        0,
        curr_frame.frame_items.size,
      ]);
      new_env.add_var_mut(new_sym, U);
      return new_sym;
    });

    const body = literal.body;
    const new_body = transform(body, new_env, userinput) as Ast.Block;
    return new Ast.ResolvedFunctionLiteral(new_params, new_body);
  }
  internal_assertion(() => false, `Unhandled literal: ${literal}`);
  throw null;
}

function transform(
  program: Ast.AstNode,
  env: Environment,
  userinput: Ast.UserInputLiteral[]
): Ast.AstNode {
  const t = (x: Ast.AstNode) => transform(x, env, userinput);
  switch (program.tag) {
    case "Literal": {
      const node = program as Ast.Literal;
      return lit(transform_literal(node.val, env, userinput));
    }
    case "BinaryOp": {
      const node = program as Ast.BinaryOp;
      return new Ast.BinaryOp(
        node.op,
        t(node.first) as E,
        t(node.second) as E,
        node._op_src
      );
    }
    case "UnaryOp": {
      const node = program as Ast.UnaryOp;
      return new Ast.UnaryOp(node.op, t(node.first) as E, node._op_src);
    }
    case "LogicalComposition": {
      const node = program as Ast.LogicalComposition;
      return new Ast.LogicalComposition(
        node.op,
        t(node.first) as E,
        t(node.second) as E,
        node._op_src
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
      return new Ast.AttributeAccess(t(node.expr) as E, node.attribute_token);
    }
    case "Name": {
      const node = program as Ast.Name;
      return new Ast.ResolvedName(node, env.lookup_name(node));
    }
    case "ExpressionStmt": {
      const node = program as Ast.ExpressionStmt;
      return new Ast.ExpressionStmt(t(node.expr) as E);
    }
    case "Block": {
      const node = program as Ast.Block;
      const new_env = env.copy();
      new_env.add_frame_mut();
      const stmts = node.stmts;
      assertion(() => stmts.length != 0, `Block cannot be empty: ${program}`);

      const new_stmts = stmts.map((stmt) => {
        if (!(stmt instanceof Ast.ConstDecl))
          return transform(stmt, new_env, userinput) as Ast.Stmt;

        const curr_frame = new_env.frames[new_env.frames.length - 1]!;
        const new_sym = new Ast.ResolvedName(new Ast.Name(stmt.sym_token), [
          0,
          curr_frame.frame_items.size,
        ]);

        new_env.add_var_mut(new_sym, U);
        const new_expr = transform(
          stmt.expr,
          new_env,
          userinput
        ) as Ast.Expression;
        return new Ast.ResolvedConstDecl(new_sym, new_expr);
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

/**
 * The following transforms performs the following
 * - Ensures that UserInput is declared in global scope
 * - Ensures only constant declarations in global scope
 * - Resolve Names and ConstDecl
 * - Returns a list of UserInput parsed from the program
 * @param program
 * @returns
 */
export function transform_program(
  program: Ast.Block
): [Ast.Block, Ast.UserInputLiteral[]] {
  const env = Environment.empty();
  const stmts = program.stmts;
  const userinput: Ast.UserInputLiteral[] = [];
  assertion(() => stmts.length != 0, `Program cannot be empty: ${program}`);

  const new_stmts = stmts.map((stmt) => {
    if (!(stmt instanceof Ast.ConstDecl))
      return transform(stmt, env, userinput) as Ast.Stmt;

    const cstmt = stmt as Ast.ConstDecl;
    assertion(
      () => cstmt.expr instanceof Ast.Literal,
      `Only constant declarations with literals allowed in global scope: ${stmt}`
    );

    const new_sym = new Ast.ResolvedName(new Ast.Name(cstmt.sym_token), [
      0,
      env.global_frame.frame_items.size,
    ]);

    env.add_var_mut(new_sym, U);
    const clit = transform_literal(
      (cstmt.expr as Ast.Literal).val,
      env,
      userinput
    );
    return new Ast.ResolvedConstDecl(new_sym, lit(clit));
  });

  return [new Ast.Block(new_stmts), userinput];
}
