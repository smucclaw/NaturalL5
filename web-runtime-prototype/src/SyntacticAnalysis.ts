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

  // Does another sanity check, to make sure that UserInput is in global scope
  // Push it to the userinput array, and returns the UserInput type
  if (literal instanceof Ast.UserInputLiteral) {
    assertion(
      () => env.is_global_scope(),
      `User input must be declared globally: : ${literal}`
    );
    userinput.push(literal);
    return literal;
  }

  // If it is a compound literal
  if (literal instanceof Ast.CompoundLiteral) {
    const props = literal.props;
    const new_props = new Map();
    // For every property in the compound literal
    // Update (old) key : value
    // Update (new) key : transform(value) / key : transform(literal)
    props.forEach((v, k) => {
      // If the environment is not in global scope
      if (!env.is_global_scope())
        // Update the new property map key : transform(value)
        return new_props.set(k, transform(v, env, userinput));
      assertion(
        () => v instanceof Ast.Literal,
        `Only constant declarations with literals allowed in global scope: ${v}`
      );
      // If it is a literal, update the new property map key : transform_literal(value)
      const cv = transform_literal((v as Ast.Literal).val, env, userinput);
      return new_props.set(k, lit(cv));
    });
    // Update the compound literal with the new transform-ed map
    return new Ast.CompoundLiteral(
      literal.sym_token,
      new_props,
      literal.prop_tokens
    );
  }

  // If it is a function literal
  if (literal instanceof Ast.FunctionLiteral) {
    // Create a copy of the environment
    const new_env = env.copy();
    // Add a new mutable frame to the new environment
    new_env.add_frame_mut();
    // Get the newly pushed empty frame
    const curr_frame = new_env.frames[new_env.frames.length - 1]!;
    const params = literal.params_tokens;

    // For every parameter
    const new_params = params.map((v) => {
      // Make the parameter a resolved name
      const new_sym = new Ast.ResolvedName(new Ast.Name(v), [
        0, // Global Scope?
        curr_frame.frame_items.size, // Latest item in the frame
      ]);
      // The parameter resolves to unknown
      new_env.add_var_mut(new_sym, U);
      return new_sym;
    });

    const body = literal.body;
    // Transform the body as well
    const new_body = transform(body, new_env, userinput) as Ast.Block;
    return new Ast.ResolvedFunctionLiteral(new_params, new_body);
  }
  internal_assertion(() => false, `Unhandled literal: ${literal}`);
  throw null;
}

// Compared to transform_literal, which... transforms literals
// This will transform the program
// This is almost like a eval function, that walks through the AST
function transform(
  program: Ast.AstNode,
  env: Environment,
  userinput: Ast.UserInputLiteral[]
): Ast.AstNode {
  const t = (x: Ast.AstNode) => transform(x, env, userinput);
  switch (program.tag) {
    case "FunctionAnnotation": {
      const node = program as Ast.FunctionAnnotation;
      return new Ast.FunctionAnnotation(
        node.annotations,
        node.parameters.map((p) =>
          p instanceof Ast.FunctionAnnotationReturn ? p : t(p)
        ) as E[],
        node._op_src
      );
    }
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
      0, // Global Scope
      env.global_frame.frame_items.size, // Latest item in the global frame
    ]);

    // Add the ResolvedName to be an undefined mutable variable to the env
    env.add_var_mut(new_sym, U);
    // Above, it is already asserted that this statement has a Literal expression
    // We can then transform this into a ConstantLiteral
    const clit = transform_literal(
      (cstmt.expr as Ast.Literal).val,
      env,
      userinput
    );
    return new Ast.ResolvedConstDecl(new_sym, lit(clit));
  });

  return [new Ast.Block(new_stmts), userinput];
}
