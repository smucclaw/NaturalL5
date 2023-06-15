import * as Ast from "./AstNode";
import { EvaluatorContext } from "./Evaluator";

let ast;
ast = new Ast.BinaryOp(
  "+",
  new Ast.BinaryOp(
    "+",
    new Ast.BinaryOp("*", new Ast.Literal(10), new Ast.Literal(5)),
    new Ast.Literal(2)
  ),
  new Ast.Literal(3)
);
ast = new Ast.LogicalComposition(
  "||",
  new Ast.Literal(false),
  new Ast.BinaryOp("<", new Ast.Literal(10), new Ast.Literal(5))
);
console.log(ast);
console.dir(ast, { depth: null });

const ctx = new EvaluatorContext(ast);
console.log(ctx.evaluate());
