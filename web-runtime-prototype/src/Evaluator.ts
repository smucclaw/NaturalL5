import * as Ast from "./AstNode";
import { Environment } from "./Environment";
import * as Eval from "./EvaluatorUtils";
import { id } from "./utils";

export class NoOpWrapper implements Ast.AstNode {
  tag = "internal_NoOpWrapper";
  constructor(readonly towrap: Ast.AstNode) {}
  toString = () => `<${this.towrap}>`;
}

export function recursive_eval(
  program: Ast.AstNode,
  env: Environment,
  ast_factory: (updated: Ast.AstNode) => Ast.AstNode
): Ast.LiteralType {
  // Short forms
  const reval = recursive_eval;
  const chain = (a: (b: Ast.AstNode) => Ast.AstNode) => (b: Ast.AstNode) =>
    ast_factory(a(b));
  const lit = (x: Ast.LiteralType) => new Ast.Literal(x);
  type E = Ast.Expression;

  let result;
  switch (program.tag) {
    case "Literal": {
      const node = program as Ast.Literal;
      result = node.val;
      break;
    }
    case "BinaryOp": {
      const node = program as Ast.BinaryOp;
      const first = reval(
        node.first,
        env,
        chain((x) => new Ast.BinaryOp(node.op, x as E, node.second))
      );
      const second = reval(
        node.second,
        env,
        chain((x) => new Ast.BinaryOp(node.op, lit(first), x as E))
      );
      result = Eval.binop_apply(node.op, first, second);
      break;
    }
    case "UnaryOp": {
      const node = program as Ast.UnaryOp;
      const first = reval(
        node.first,
        env,
        chain((x) => new Ast.UnaryOp(node.op, x as E))
      );
      result = Eval.unop_apply(node.op, first);
      break;
    }
    case "LogicalComposition": {
      const node = program as Ast.LogicalComposition;
      const first = reval(
        node.first,
        env,
        chain((x) => new Ast.LogicalComposition(node.op, x as E, node.second))
      );
      const eval_second = Eval.logicalcomp_eval_second(node.op, first);
      if (!eval_second) return first;
      const second = reval(
        node.second,
        env,
        chain((x) => new Ast.LogicalComposition(node.op, lit(first), x as E))
      );
      result = Eval.logicalcomp_apply(node.op, first, second);
      break;
    }
    case "ConditionalExpr": {
      const node = program as Ast.ConditionalExpr;
      const pred = reval(
        node.pred,
        env,
        chain((x) => new Ast.ConditionalExpr(x as E, node.cons, node.alt))
      );
      result = reval(pred ? node.cons : node.alt, env, id);
      break;
    }
    case "AttributeAccess": {
      const node = program as Ast.AttributeAccess;
      const obj = reval(
        node.expr,
        env,
        chain((x) => new Ast.AttributeAccess(x as E, node.attribute))
      );
      const attrib = Eval.attrib_apply(node.attribute, obj);
      result = reval(attrib, env, ast_factory);
      break;
    }
    case "ResolvedName": {
      const node = program as Ast.ResolvedName;
      const res_ast = env.lookup(node);
      result = reval(res_ast, env, ast_factory);
      break;
    }
    default:
      throw new Error(`Unhandled AstNode: ${program}`);
  }

  console.log(">>>>>>>>>>>>>>>>> " + program.tag);
  console.log("Environment:", env.toString());
  console.log("Evaluated  :", program.toString());
  console.log(
    "Current AST:",
    ast_factory(new NoOpWrapper(lit(result))).toString()
  );
  console.log();
  return result;
}

export class EvaluatorContext {
  public readonly program: Ast.AstNode;
  public readonly env: Environment;

  constructor(program: Ast.AstNode, env?: Environment) {
    this.program = program;
    this.env = env ?? new Environment();
  }

  evaluate(): Ast.LiteralType {
    const res = recursive_eval(this.program, this.env, id);
    return res;
  }
}

// (first) => new Ast.BinaryOp(node.op, first, node.second)
//
