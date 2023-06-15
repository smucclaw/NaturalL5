import * as Ast from "./AstNode";
import {EvaluatorContext} from "./Evaluator";

// const ast = new Ast.BinaryOp("+", 
//     new Ast.BinaryOp("+", 
//         new Ast.BinaryOp("*", new Ast.Literal(10), new Ast.Literal(5)),
//         new Ast.Literal(2)), 
//     new Ast.Literal(3));

const ast = new Ast.BinaryOp("+", 
    new Ast.BinaryOp("+", 
        new Ast.BinaryOp("*", new Ast.Literal(10), new Ast.Literal(5)),
        new Ast.Literal(2)), 
    new Ast.Literal(3));
console.log(ast);

const ctx = new EvaluatorContext(ast);
console.log(ctx.evaluate());