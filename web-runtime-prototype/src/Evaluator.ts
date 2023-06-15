import * as Ast from "./AstNode";
import { Environment } from "./Environment";
import * as Eval from "./EvaluatorUtils";
import { id } from "./utils";

export class EvaluatorContext {
  public readonly program: Ast.AstNode;
  public readonly env: Environment;

  constructor(program: Ast.AstNode, env?: Environment) {
    this.program = program;
    this.env = env ?? new Environment();
  }

  static recursive_eval(
    program: Ast.AstNode,
    env: Environment,
    ast_factory: (updated: Ast.AstNode) => Ast.AstNode
  ): Ast.LiteralType {
    // Short forms
    const reval = EvaluatorContext.recursive_eval;
    const chain = (a: (b: Ast.AstNode) => Ast.AstNode) => (b: Ast.AstNode) =>
      ast_factory(a(b));

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
          chain((x) => new Ast.BinaryOp(node.op, x, node.second))
        );
        const second = reval(
          node.second,
          env,
          chain((x) => new Ast.BinaryOp(node.op, new Ast.Literal(first), x))
        );
        result = Eval.binop_apply(node.op, first, second);
        break;
      }
      case "UnaryOp": {
        const node = program as Ast.UnaryOp;
        const first = reval(
          node.first,
          env,
          chain((x) => new Ast.UnaryOp(node.op, x))
        )
        result = Eval.unop_apply(node.op, first);
        break;
      }
      case "LogicalComposition": {
        const node = program as Ast.LogicalComposition;
        const first = reval(
          node.first,
          env,
          chain((x) => new Ast.LogicalComposition(node.op, x, node.second))
        );
        const eval_second = Eval.logicalcomp_eval_second(node.op, first);
        if (!eval_second) return first;
        const second = reval(
          node.second,
          env,
          chain((x) => new Ast.LogicalComposition(node.op, new Ast.Literal(first), x))
        );
        result = Eval.logicalcomp_apply(node.op, first, second);
        break;
      }
      case "ConditionalExpr": {
        const node = program as Ast.ConditionalExpr;
        const pred = reval(
          node.pred,
          env,
          chain((x) => new Ast.ConditionalExpr(x, node.cons, node.alt))
        );
        result = reval(pred ? node.cons : node.alt, env, id);
        break;
      }
      case "AttributeAccess": {
        const node = program as Ast.AttributeAccess;
        const obj = reval(
          node.expr,
          env,
          chain((x) => new Ast.AttributeAccess(x, node.attribute))
        );
        const attrib = Eval.attrib_apply(node.attribute, obj);
        result = reval(attrib, env, id);
        break;
      }
      case "Name": {
        const node = program as Ast.Name;
        const res_ast = env.lookup(node.sym);
        if (res_ast == undefined) {
          throw new Error(
            `Symbol ${node.sym} can't be found in the environment.`
          );
        }
        const res = reval(res_ast, env, id);
        result = res;
        break;
      }
      default:
        throw new Error(`Unhandled AstNode: ${program}`);
    }

    console.log(">>>>>>>>>>>>>>>>> " + program.tag);
    console.log(ast_factory(new Ast.Block(new Ast.Literal(result))).toString());
    return result;
  }

  evaluate(): Ast.LiteralType {
    const res = EvaluatorContext.recursive_eval(
      this.program,
      this.env,
      id
    );
    return res;
  }
}

// (first) => new Ast.BinaryOp(node.op, first, node.second)
//