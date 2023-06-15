import * as Ast from "./AstNode";
import { Environment } from "./Environment";
import * as Eval from "./EvaluatorUtils";
// import { internal_assertion } from "./utils";

export class EvaluatorContext {
  public program: Ast.AstNode;
  public env: Environment;

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
      case "Name": {
        const node = program as Ast.Name;
        const res_ast = env.lookup(node.sym);
        if (res_ast == undefined) {
          throw new Error(
            `Symbol ${node.sym} can't be found in the environment.`
          );
        }
        const res = reval(res_ast, env, (lit) => lit);
        result = res;
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
        result = Eval.apply_binop(node.op, first, second);
        break;
      }
      default:
        throw new Error(`Unhandled AstNode: ${program}`);
    }

    console.log(">>>>>>>>>>>>>>>>> " + program.tag);
    console.log(ast_factory(new Ast.Block(program)).toString());
    return result;
  }

  evaluate(): Ast.LiteralType {
    const res = EvaluatorContext.recursive_eval(
      this.program,
      this.env,
      (lit) => lit
    );
    return res;
  }
}

// (first) => new Ast.BinaryOp(node.op, first, node.second)
//
