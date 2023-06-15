import * as Ast from "./AstNode";
import { lex } from "./Lexer";
import { Token } from "./Token";
import { parse } from "./Parser";
// import { EvaluatorContext } from "./Evaluator";

// let ast;
// ast = new Ast.BinaryOp(
//   "+",
//   new Ast.BinaryOp(
//     "+",
//     new Ast.BinaryOp("*", new Ast.Literal(10), new Ast.Literal(5)),
//     new Ast.Literal(2)
//   ),
//   new Ast.Literal(3)
// );
// ast = new Ast.LogicalComposition(
//   "||",
//   new Ast.Literal(false),
//   new Ast.BinaryOp("<", new Ast.Literal(10), new Ast.Literal(5))
// );
// console.log(ast);
// console.dir(ast, { depth: null });
// const ast = new Ast.BinaryOp("+",
//     new Ast.BinaryOp("+",
//         new Ast.BinaryOp("*", new Ast.Literal(10), new Ast.Literal(5)),
//         new Ast.Literal(2)),
//     new Ast.Literal(3));

// const ast = new Ast.BinaryOp(
//   "+",
//   new Ast.BinaryOp(
//     "+",
//     new Ast.BinaryOp("*", new Ast.Literal(10), new Ast.Literal(5)),
//     new Ast.Literal(2)
//   ),
//   new Ast.Literal(3)
// );
// console.log(ast);

// const ctx = new EvaluatorContext(ast);
// console.log(ctx.evaluate());

// const ast = new Ast.BinaryOp("+",
//     new Ast.BinaryOp("+",
//         new Ast.BinaryOp("*", new Ast.Literal(10), new Ast.Literal(5)),
//         new Ast.Literal(2)),
//     new Ast.Literal(3));

// const ast = new Ast.BinaryOp(
//   "+",
//   new Ast.BinaryOp(
//     "+",
//     new Ast.BinaryOp("*", new Ast.Literal(10), new Ast.Literal(5)),
//     new Ast.Literal(2)
//   ),
//   new Ast.Literal(3)
// );
// console.log(ast);

// const ctx = new EvaluatorContext(ast);
// console.log(ctx.evaluate());

const test_function = `
var a = 10;
var b = 20;
var c = (10 + 20);
var d = ((10 + 20) + 30);

function a(a, b, c) {
    (10 + 1)
}

function b(x, y, z) {
    (x + y + z)
}
`;

// const tokens: Array<Token> = lex("(10*5) + 3 + 2");
// const tokens: Array<Token> = lex("(3 + 5)");
const tokens: Array<Token> = lex(test_function);
console.log("-- Lexer tokens --");
console.dir(tokens, { depth: null });
// console.log(tokens);
console.log("-- Lexer tokens --");

const ast: Ast.Block = parse(tokens);
console.log("-- Parser tokens --");
console.dir(ast, { depth: null });
console.log("-- Parser tokens --");

// const s = ast.body as Ast.Sequential;
// const b = s.stmts[0] as Ast.BinaryOp;
// const ctx = new EvaluatorContext(b);
// console.log(ctx.evaluate());

// (10 * 5) + 3
// ((10 * 5) + 3)

`
-- everything in a block ends with a semi colon
function a() {
    (10 + 1);
}

-- expressions also end with semi colons
var a = 10;
(10+1);
`;
